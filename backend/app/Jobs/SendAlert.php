<?php

namespace App\Jobs;

use App\Events\AlertCreated;
use App\Models\Alert;
use App\Models\Detection;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Exception;

class SendAlert implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The maximum number of seconds the job can run.
     */
    public int $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $detection_id
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $detection = Detection::with(['missingPerson', 'missingPerson.assignedOfficer'])
            ->findOrFail($this->detection_id);

        $person = $detection->missingPerson;

        if (!$person) {
            Log::error("No missing person found for detection {$this->detection_id}");
            return;
        }

        // Collect relevant users to notify
        $recipients = $this->getRecipients($person);

        if ($recipients->isEmpty()) {
            Log::warning("No recipients found for detection {$this->detection_id}");
            return;
        }

        // Create alert records for each recipient
        foreach ($recipients as $user) {
            try {
                $alert = Alert::create([
                    'detection_id' => $detection->id,
                    'missing_person_id' => $person->id,
                    'recipient_id' => $user->id,
                    'alert_type' => $this->determineAlertType($detection),
                    'priority' => $this->determinePriority($detection),
                    'title' => "High Confidence Detection: {$person->first_name} {$person->last_name}",
                    'message' => $this->buildAlertMessage($detection, $person),
                    'confidence_score' => $detection->confidence_score,
                    'latitude' => $detection->latitude,
                    'longitude' => $detection->longitude,
                    'location_address' => $detection->location_address,
                    'screenshot_path' => $detection->screenshot_path,
                    'is_read' => false,
                    'channels_sent' => json_encode([]),
                ]);

                // Send notifications via configured channels
                $this->sendNotifications($alert, $user, $detection);

                // Fire alert created event for real-time updates
                AlertCreated::dispatch($alert);

                Log::info("Alert {$alert->id} created and sent to user {$user->id}");
            } catch (Exception $e) {
                Log::error("Failed to send alert to user {$user->id} for detection {$this->detection_id}: " . $e->getMessage());
            }
        }
    }

    /**
     * Get list of users who should receive the alert.
     */
    protected function getRecipients($person)
    {
        $userIds = collect();

        // Assigned officer
        if ($person->assigned_officer_id) {
            $userIds->push($person->assigned_officer_id);
        }

        // Creator of the case
        if ($person->created_by) {
            $userIds->push($person->created_by);
        }

        // All admins
        $adminIds = User::where('role', 'admin')
            ->orWhere('role', 'super_admin')
            ->pluck('id');

        $userIds = $userIds->merge($adminIds)->unique();

        return User::whereIn('id', $userIds)->get();
    }

    /**
     * Determine the alert type based on detection.
     */
    protected function determineAlertType(Detection $detection): string
    {
        if ($detection->confidence_score >= 0.90) {
            return 'critical_match';
        } elseif ($detection->confidence_score >= 0.85) {
            return 'high_confidence';
        } elseif ($detection->confidence_score >= 0.70) {
            return 'potential_match';
        }

        return 'low_confidence';
    }

    /**
     * Determine the alert priority.
     */
    protected function determinePriority(Detection $detection): string
    {
        if ($detection->confidence_score >= 0.90) {
            return 'critical';
        } elseif ($detection->confidence_score >= 0.85) {
            return 'high';
        } elseif ($detection->confidence_score >= 0.70) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * Build the alert message text.
     */
    protected function buildAlertMessage(Detection $detection, $person): string
    {
        $confidence = round($detection->confidence_score * 100, 1);
        $location = $detection->location_address ?? 'Unknown location';
        $source = ucfirst(str_replace('_', ' ', $detection->source));

        return "A {$confidence}% confidence detection of {$person->first_name} {$person->last_name} "
            . "has been identified via {$source} at {$location}. "
            . "Detected at: {$detection->detected_at->format('M d, Y H:i:s')}. "
            . "Please verify this detection immediately.";
    }

    /**
     * Send notifications via all configured channels.
     */
    protected function sendNotifications(Alert $alert, User $user, Detection $detection): void
    {
        $channelsSent = [];

        try {
            // Send via NotificationService
            $notificationService = app(NotificationService::class);

            // Email notification
            if ($user->notify_email) {
                $notificationService->sendEmail($user, 'new_detection_alert', [
                    'alert' => $alert,
                    'detection' => $detection,
                    'person' => $detection->missingPerson,
                ]);
                $channelsSent[] = 'email';
            }

            // SMS notification
            if ($user->notify_sms && $user->phone) {
                $notificationService->sendSms($user, $alert->message);
                $channelsSent[] = 'sms';
            }

            // Push notification
            if ($user->notify_push) {
                $notificationService->sendPush($user, [
                    'title' => $alert->title,
                    'body' => $alert->message,
                    'data' => [
                        'alert_id' => $alert->id,
                        'detection_id' => $detection->id,
                    ],
                ]);
                $channelsSent[] = 'push';
            }

            // Dashboard notification (always sent)
            $channelsSent[] = 'dashboard';

            // Update channels sent
            $alert->update(['channels_sent' => json_encode($channelsSent)]);

        } catch (Exception $e) {
            Log::error("Notification service error: " . $e->getMessage());
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(Exception $exception): void
    {
        Log::error("SendAlert job failed for detection {$this->detection_id}: " . $exception->getMessage());
    }
}