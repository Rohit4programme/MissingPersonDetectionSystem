<?php

namespace App\Jobs;

use App\Enums\AlertChannel;
use App\Models\Alert;
use App\Notifications\FaceMatchNotification;
use App\Notifications\HighConfidenceAlertNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Throwable;

class SendAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $maxExceptions = 3;
    public int $backoff = [60, 300, 900];

    /**
     * Create a new job instance.
     */
    public function __construct(
        public readonly int $alertId,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $alert = Alert::with(['user', 'detection', 'missingPerson'])->findOrFail($this->alertId);

        if ($alert->sent_at !== null) {
            Log::info('SendAlertJob: Alert already sent', [
                'alert_id' => $this->alertId,
            ]);
            return;
        }

        $channel = $alert->channel;

        try {
            match ($channel) {
                AlertChannel::SMS => $this->sendSms($alert),
                AlertChannel::EMAIL => $this->sendEmail($alert),
                AlertChannel::PUSH => $this->sendPush($alert),
                AlertChannel::WHATSAPP => $this->sendWhatsApp($alert),
                AlertChannel::DASHBOARD => $this->sendDashboard($alert),
                default => Log::warning('SendAlertJob: Unknown channel', [
                    'alert_id' => $this->alertId,
                    'channel' => $channel,
                ]),
            };

            $alert->update(['sent_at' => now()]);

            Log::info('SendAlertJob: Alert sent successfully', [
                'alert_id' => $this->alertId,
                'channel' => $channel,
            ]);

        } catch (Throwable $e) {
            Log::error('SendAlertJob: Failed to send alert', [
                'alert_id' => $this->alertId,
                'channel' => $channel,
                'error' => $e->getMessage(),
            ]);

            if ($channel !== AlertChannel::DASHBOARD) {
                $this->sendDashboard($alert);
                $alert->update([
                    'sent_at' => now(),
                    'metadata' => json_encode([
                        'original_channel' => $channel,
                        'fallback' => true,
                        'fallback_reason' => $e->getMessage(),
                    ]),
                ]);
                return;
            }

            throw $e;
        }
    }

    /**
     * Send SMS alert.
     */
    private function sendSms(Alert $alert): void
    {
        $user = $alert->user;

        if (!$user || !$user->phone) {
            throw new \RuntimeException('User phone number not available');
        }

        $twilioSid = config('services.twilio.sid');
        $twilioToken = config('services.twilio.token');
        $twilioFrom = config('services.twilio.from');

        if (!$twilioSid) {
            Log::warning('SendAlertJob: Twilio not configured, using fallback');
            $this->sendDashboard($alert);
            return;
        }

        $response = Http::timeout(30)->withBasicAuth($twilioSid, $twilioToken)
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$twilioSid}/Messages.json", [
                'From' => $twilioFrom,
                'To' => $user->phone,
                'Body' => "[MPDS] {$alert->title}\n{$alert->message}",
            ]);

        if (!$response->successful()) {
            throw new \RuntimeException("SMS send failed: {$response->body()}");
        }
    }

    /**
     * Send email alert.
     */
    private function sendEmail(Alert $alert): void
    {
        $user = $alert->user;

        if (!$user || !$user->email) {
            throw new \RuntimeException('User email not available');
        }

        $user->notify(new \App\Notifications\GenericAlertNotification($alert));
    }

    /**
     * Send push notification.
     */
    private function sendPush(Alert $alert): void
    {
        $user = $alert->user;

        if (!$user || !$user->push_subscription) {
            throw new \RuntimeException('User push subscription not available');
        }

        $fcmKey = config('services.fcm.server_key');

        if (!$fcmKey) {
            Log::warning('SendAlertJob: FCM not configured, using fallback');
            $this->sendDashboard($alert);
            return;
        }

        $response = Http::timeout(30)
            ->withHeaders([
                'Authorization' => "key={$fcmKey}",
                'Content-Type' => 'application/json',
            ])
            ->post('https://fcm.googleapis.com/fcm/send', [
                'to' => $user->push_subscription,
                'notification' => [
                    'title' => $alert->title,
                    'body' => $alert->message,
                    'icon' => '/icons/alert.png',
                    'click_action' => url("/alerts/{$alert->id}"),
                ],
                'data' => [
                    'alert_id' => $alert->id,
                    'type' => $alert->type->value,
                    'priority' => $alert->priority,
                ],
            ]);

        if (!$response->successful()) {
            throw new \RuntimeException("Push notification failed: {$response->body()}");
        }
    }

    /**
     * Send WhatsApp alert.
     */
    private function sendWhatsApp(Alert $alert): void
    {
        $user = $alert->user;

        if (!$user || !$user->phone) {
            throw new \RuntimeException('User phone number not available');
        }

        $whatsappToken = config('services.whatsapp.token');
        $whatsappPhoneId = config('services.whatsapp.phone_id');

        if (!$whatsappToken) {
            Log::warning('SendAlertJob: WhatsApp not configured, using fallback');
            $this->sendDashboard($alert);
            return;
        }

        $response = Http::timeout(30)
            ->withHeaders([
                'Authorization' => "Bearer {$whatsappToken}",
                'Content-Type' => 'application/json',
            ])
            ->post("https://graph.facebook.com/v17.0/{$whatsappPhoneId}/messages", [
                'messaging_product' => 'whatsapp',
                'to' => $user->phone,
                'type' => 'text',
                'text' => [
                    'body' => "*MPDS Alert*\n\n{$alert->title}\n\n{$alert->message}",
                ],
            ]);

        if (!$response->successful()) {
            throw new \RuntimeException("WhatsApp send failed: {$response->body()}");
        }
    }

    /**
     * Send dashboard notification (in-app).
     */
    private function sendDashboard(Alert $alert): void
    {
        $user = $alert->user;

        if (!$user) {
            Log::warning('SendAlertJob: No user for dashboard alert', [
                'alert_id' => $alert->id,
            ]);
            return;
        }

        $notification = match ($alert->type) {
            AlertType::FACE_MATCH => new FaceMatchNotification($alert->detection),
            default => new \App\Notifications\GenericAlertNotification($alert),
        };

        $user->notify($notification);
    }

    /**
     * Handle a job failure.
     */
    public function failed(Throwable $exception): void
    {
        Log::error('SendAlertJob: Permanently failed', [
            'alert_id' => $this->alertId,
            'error' => $exception->getMessage(),
        ]);

        try {
            $alert = Alert::find($this->alertId);
            if ($alert) {
                $alert->update([
                    'metadata' => json_encode(array_merge(
                        json_decode($alert->metadata, true) ?? [],
                        ['failed' => true, 'failure_reason' => $exception->getMessage()]
                    )),
                ]);
            }
        } catch (Throwable $e) {
            Log::error('SendAlertJob: Failed to update alert on failure', [
                'alert_id' => $this->alertId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
