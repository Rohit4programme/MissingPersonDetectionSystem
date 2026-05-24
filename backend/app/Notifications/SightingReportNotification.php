<?php

namespace App\Notifications;

use App\Models\Sighting;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SightingReportNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public readonly Sighting $sighting,
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
        $person = $this->sighting->missingPerson;
        $reporter = $this->sighting->reporter;

        $mail = (new MailMessage)
            ->subject("New Sighting Report: {$person->full_name}")
            ->greeting("Hello {$notifiable->name},")
            ->line("A new sighting has been reported for missing person **{$person->full_name}**.")
            ->line("**Sighting Location:** {$this->sighting->location}")
            ->line("**Date of Sighting:** {$this->sighting->sighted_at}")
            ->line("**Status:** {$this->sighting->status}");

        if ($this->sighting->is_anonymous) {
            $mail->line('**Reporter:** Anonymous');
        } elseif ($reporter) {
            $mail->line("**Reporter:** {$reporter->name} ({$reporter->email})");
            if ($reporter->phone) {
                $mail->line("**Reporter Phone:** {$reporter->phone}");
            }
        }

        if ($this->sighting->description) {
            $mail->line("**Description:** {$this->sighting->description}");
        }

        return $mail
            ->action('View Sighting', url("/sightings/{$this->sighting->id}"))
            ->line('Please review this sighting report and verify the information.')
            ->salutation('Regards, Missing Person Detection System');
    }

    /**
     * Get the array representation of the notification stored in the database.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $person = $this->sighting->missingPerson;
        $reporter = $this->sighting->reporter;

        return [
            'type' => 'sighting_report',
            'sighting_id' => $this->sighting->id,
            'missing_person_id' => $this->sighting->missing_person_id,
            'person_name' => $person->full_name,
            'location' => $this->sighting->location,
            'latitude' => $this->sighting->latitude,
            'longitude' => $this->sighting->longitude,
            'sighted_at' => $this->sighting->sighted_at?->toIso8601String(),
            'status' => $this->sighting->status,
            'is_anonymous' => $this->sighting->is_anonymous,
            'reporter' => $this->sighting->is_anonymous
                ? ['name' => 'Anonymous']
                : [
                    'name' => $reporter?->name,
                    'email' => $reporter?->email,
                    'phone' => $reporter?->phone,
                ],
            'description' => $this->sighting->description,
            'link' => "/sightings/{$this->sighting->id}",
        ];
    }
}
