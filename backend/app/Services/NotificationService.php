<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\User;
use App\Notifications\AlertNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class NotificationService
{
    /**
     * Send an alert through the appropriate channel(s).
     *
     * @param  Alert  $alert  The alert model instance
     * @return void
     */
    public function sendAlert(Alert $alert): void
    {
        $user = $alert->user;

        if (!$user) {
            Log::warning('NotificationService: Alert has no associated user', [
                'alert_id' => $alert->id,
            ]);
            return;
        }

        $channel = $alert->channel ?? 'dashboard';
        $message = $alert->message;
        $title = $alert->title ?? 'Missing Person Alert';

        try {
            switch ($channel) {
                case 'sms':
                    if ($user->phone) {
                        $this->sendSMS($user->phone, $message);
                    }
                    break;

                case 'email':
                    if ($user->email) {
                        $this->sendEmail($user->email, $title, $message);
                    }
                    break;

                case 'push':
                    $this->sendPush($user->id, $title, $message);
                    break;

                case 'whatsapp':
                    if ($user->phone) {
                        $this->sendWhatsApp($user->phone, $message);
                    }
                    break;

                case 'dashboard':
                default:
                    // Dashboard alerts are persisted in the database and broadcast
                    break;
            }

            // Always create a dashboard alert for in-app visibility
            if ($channel !== 'dashboard') {
                $this->createDashboardAlert(
                    $user->id,
                    $alert->type ?? 'general',
                    $message
                );
            }

            // Broadcast the alert for real-time updates
            broadcast(new \App\Events\AlertCreated($alert))->toOthers();

            Log::info('NotificationService: Alert sent', [
                'alert_id' => $alert->id,
                'channel' => $channel,
                'user_id' => $user->id,
            ]);
        } catch (\Exception $e) {
            Log::error('NotificationService: Failed to send alert', [
                'alert_id' => $alert->id,
                'channel' => $channel,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send an SMS message via Twilio.
     *
     * @param  string  $phone    Recipient phone number (E.164 format recommended)
     * @param  string  $message  The message body
     * @return bool
     */
    public function sendSMS(string $phone, string $message): bool
    {
        $accountSid = config('services.twilio.account_sid');
        $authToken = config('services.twilio.auth_token');
        $fromNumber = config('services.twilio.from_number');

        if (!$accountSid || !$authToken || !$fromNumber) {
            Log::warning('NotificationService: Twilio credentials not configured');
            return false;
        }

        try {
            $response = Http::timeout(30)
                ->withBasicAuth($accountSid, $authToken)
                ->asForm()
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$accountSid}/Messages.json", [
                    'To' => $phone,
                    'From' => $fromNumber,
                    'Body' => $message,
                ]);

            if ($response->successful()) {
                Log::info('NotificationService: SMS sent', [
                    'to' => $phone,
                    'sid' => $response->json('sid'),
                ]);
                return true;
            }

            Log::error('NotificationService: Twilio API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return false;
        } catch (\Exception $e) {
            Log::error('NotificationService: SMS send failed', [
                'to' => $phone,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Send an email notification using Laravel's mail system.
     *
     * @param  string  $email    Recipient email address
     * @param  string  $subject  Email subject line
     * @param  string  $body     Email body content (plain text or HTML)
     * @return bool
     */
    public function sendEmail(string $email, string $subject, string $body): bool
    {
        try {
            Mail::raw($body, function ($message) use ($email, $subject) {
                $message->to($email)
                    ->subject($subject)
                    ->from(
                        config('mail.from.address', 'noreply@mpds.local'),
                        config('mail.from.name', 'Missing Person Detection System')
                    );
            });

            Log::info('NotificationService: Email sent', [
                'to' => $email,
                'subject' => $subject,
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('NotificationService: Email send failed', [
                'to' => $email,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Send a push notification to a user.
     *
     * Uses Laravel's notification system which can be extended
     * to Firebase, OneSignal, or any custom channel.
     *
     * @param  int     $userId  Target user ID
     * @param  string  $title   Notification title
     * @param  string  $body    Notification body
     * @return bool
     */
    public function sendPush(int $userId, string $title, string $body): bool
    {
        try {
            $user = User::find($userId);

            if (!$user) {
                Log::warning('NotificationService: User not found for push notification', [
                    'user_id' => $userId,
                ]);
                return false;
            }

            $data = [
                'title' => $title,
                'body' => $body,
                'icon' => '/images/alert-icon.png',
                'click_action' => '/dashboard/alerts',
            ];

            // Use the notification system — implement the PushNotification channel
            // in the Notification class or broadcast via WebSocket
            Notification::send($user, new AlertNotification($data));

            Log::info('NotificationService: Push notification sent', [
                'user_id' => $userId,
                'title' => $title,
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('NotificationService: Push notification failed', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Send a WhatsApp message via the WhatsApp Business API.
     *
     * @param  string  $phone    Recipient phone number (E.164 format)
     * @param  string  $message  The message body
     * @return bool
     */
    public function sendWhatsApp(string $phone, string $message): bool
    {
        $apiUrl = config('services.whatsapp.api_url');
        $accessToken = config('services.whatsapp.access_token');
        $phoneNumberId = config('services.whatsapp.phone_number_id');

        if (!$apiUrl || !$accessToken || !$phoneNumberId) {
            Log::warning('NotificationService: WhatsApp credentials not configured');
            return false;
        }

        try {
            $response = Http::timeout(30)
                ->withToken($accessToken)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post("https://{$apiUrl}/{$phoneNumberId}/messages", [
                    'messaging_product' => 'whatsapp',
                    'recipient_type' => 'individual',
                    'to' => $phone,
                    'type' => 'text',
                    'text' => [
                        'preview_url' => false,
                        'body' => $message,
                    ],
                ]);

            if ($response->successful()) {
                Log::info('NotificationService: WhatsApp message sent', [
                    'to' => $phone,
                    'message_id' => $response->json('messages.0.id'),
                ]);
                return true;
            }

            Log::error('NotificationService: WhatsApp API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return false;
        } catch (\Exception $e) {
            Log::error('NotificationService: WhatsApp send failed', [
                'to' => $phone,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Create a dashboard alert and broadcast it in real-time.
     *
     * @param  int     $userId   Target user ID
     * @param  string  $type     Alert type (e.g., 'detection', 'match', 'system', 'warning')
     * @param  string  $message  Alert message content
     * @return Alert|null  The created alert, or null on failure
     */
    public function createDashboardAlert(int $userId, string $type, string $message): ?Alert
    {
        try {
            $alert = Alert::create([
                'user_id' => $userId,
                'type' => $type,
                'message' => $message,
                'channel' => 'dashboard',
                'is_read' => false,
            ]);

            // Broadcast for real-time dashboard updates
            broadcast(new \App\Events\AlertCreated($alert))->toOthers();

            Log::info('NotificationService: Dashboard alert created', [
                'alert_id' => $alert->id,
                'user_id' => $userId,
                'type' => $type,
            ]);

            return $alert;
        } catch (\Exception $e) {
            Log::error('NotificationService: Failed to create dashboard alert', [
                'user_id' => $userId,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Send an alert to multiple users at once.
     *
     * @param  array   $userIds  Array of user IDs
     * @param  string  $type     Alert type
     * @param  string  $title    Alert title
     * @param  string  $message  Alert message
     * @param  string  $channel  Notification channel
     * @return int  Number of alerts successfully sent
     */
    public function sendBulkAlert(
        array $userIds,
        string $type,
        string $title,
        string $message,
        string $channel = 'dashboard'
    ): int {
        $sent = 0;

        foreach ($userIds as $userId) {
            try {
                $alert = Alert::create([
                    'user_id' => $userId,
                    'type' => $type,
                    'title' => $title,
                    'message' => $message,
                    'channel' => $channel,
                    'is_read' => false,
                ]);

                $this->sendAlert($alert);
                $sent++;
            } catch (\Exception $e) {
                Log::error('NotificationService: Bulk alert failed for user', [
                    'user_id' => $userId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info('NotificationService: Bulk alert complete', [
            'total' => count($userIds),
            'sent' => $sent,
            'type' => $type,
        ]);

        return $sent;
    }
}
