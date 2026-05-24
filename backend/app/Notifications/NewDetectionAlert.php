<?php

namespace App\Notifications;

use App\Models\Detection;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewDetectionAlert extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Detection $detection
    ) {}

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $person = $this->detection->missingPerson;
        $personName = $person ? "{$person->first_name} {$person->last_name}" : 'Unknown';
        $confidence = round($this->detection->confidence_score * 100, 1);
        $location = $this->detection->location_address ?? 'Unknown location';
        $detectedAt = $this->detection->detected_at?->format('M d, Y H:i:s') ?? 'Unknown';
        $source = ucfirst(str_replace('_', ' ', $this->detection->source));

        $mail = (new MailMessage)
            ->subject("URGENT: High Confidence Detection - {$personName}")
            ->greeting("Dear {$notifiable->first_name},")
            ->line("**A high-confidence detection has been identified for your missing person case.**")
            ->line("**Missing Person:** {$personName}")
            ->line("**Confidence Score:** {$confidence}%")
            ->line("**Detection Source:** {$source}")
            ->line("**Location:** {$location}")
            ->line("**Detected At:** {$detectedAt}");

        if ($this->detection->camera) {
            $mail->line("**Camera:** {$this->detection->camera->name} ({$this->detection->camera->location_name})");
        }

        if ($this->detection->sighting) {
            $mail->line("**Reported By:** {$this->detection->sighting->reporter_name}");
        }

        $mail->action('View Detection Details', url("/detections/{$this->detection->id}"))
            ->line('**Please verify this detection as soon as possible.**')
            ->line('If this is a confirmed match, update the case status immediately.')
            ->salutation('Regards, Missing Person Detection System');

        return $mail;
    }

    /**
     * Get the array representation of the notification for the database.
     */
    public function toArray(object $notifiable): array
    {
        $person = $this->detection->missingPerson;

        return [
            'type' => 'new_detection_alert',
            'detection_id' => $this->detection->id,
            'missing_person_id' => $this->detection->missing_person_id,
            'person_name' => $person ? "{$person->first_name} {$person->last_name}" : 'Unknown',
            'confidence_score' => $this->detection->confidence_score,
            'source' => $this->detection->source,
            'latitude' => $this->detection->latitude,
            'longitude' => $this->detection->longitude,
            'location_address' => $this->detection->location_address,
            'screenshot_path' => $this->detection->screenshot_path,
            'detected_at' => $this->detection->detected_at?->toISOString(),
            'is_verified' => $this->detection->is_verified,
            'message' => "High confidence detection ({$this->detection->confidence_score}) for {$person?->first_name} {$person?->last_name}",
        ];
    }
}