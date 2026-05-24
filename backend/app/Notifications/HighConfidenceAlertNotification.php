<?php

namespace App\Notifications;

use App\Models\Camera;
use App\Models\Detection;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class HighConfidenceAlertNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public readonly Detection $detection,
        public readonly ?Camera $camera = null,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $person = $this->detection->missingPerson;
        $confidencePercent = round($this->detection->confidence * 100, 1);

        $mail = (new MailMessage)
            ->subject("URGENT: High Confidence Match - {$person->full_name}")
            ->greeting("URGENT ALERT - {$notifiable->name},")
            ->line("A **high-confidence** face match has been detected for missing person **{$person->full_name}**.")
            ->line("**Confidence Score:** {$confidencePercent}%")
            ->line("**Detection Location:** {$this->detection->location}")
            ->line("**Detected At:** {$this->detection->detected_at}")
            ->line("**Source:** {$this->detection->source}");

        if ($this->camera) {
            $mail->line("**Camera:** {$this->camera->name}")
                 ->line("**Camera Location:** {$this->camera->location}");
        }

        return $mail
            ->action('View Detection Now', url("/detections/{$this->detection->id}"))
            ->line('This is a high-confidence match requiring immediate attention. Please verify this detection immediately.')
            ->salutation('Regards, Missing Person Detection System');
    }

    /**
     * Get the array representation of the notification stored in the database.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $person = $this->detection->missingPerson;

        return [
            'type' => 'high_confidence_alert',
            'priority' => 'urgent',
            'detection_id' => $this->detection->id,
            'missing_person_id' => $this->detection->missing_person_id,
            'person_name' => $person->full_name,
            'confidence' => $this->detection->confidence,
            'confidence_percent' => round($this->detection->confidence * 100, 1),
            'location' => $this->detection->location,
            'latitude' => $this->detection->latitude,
            'longitude' => $this->detection->longitude,
            'source' => $this->detection->source,
            'detected_at' => $this->detection->detected_at?->toIso8601String(),
            'camera' => $this->camera ? [
                'id' => $this->camera->id,
                'name' => $this->camera->name,
                'location' => $this->camera->location,
            ] : null,
            'screenshot_path' => $this->detection->screenshot_path,
            'link' => "/detections/{$this->detection->id}",
        ];
    }
}
