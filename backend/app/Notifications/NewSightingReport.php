<?php

namespace App\Notifications;

use App\Models\Sighting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewSightingReport extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Sighting $sighting
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
        $person = $this->sighting->missingPerson;
        $personName = $person ? "{$person->first_name} {$person->last_name}" : 'Unknown';
        $location = $this->sighting->location_address ?? 'Location not specified';
        $sightedAt = $this->sighting->sighted_at?->format('M d, Y H:i:s') ?? 'Not specified';

        $mail = (new MailMessage)
            ->subject("New Sighting Report: {$personName}")
            ->greeting("Dear {$notifiable->first_name},")
            ->line("A new sighting report has been submitted for missing person **{$personName}**.")
            ->line("**Case Number:** {$person?->case_number}")
            ->line("**Reporter:** {$this->sighting->reporter_name}")
            ->line("**Reporter Contact:** {$this->sighting->reporter_email ?? 'Not provided'}")
            ->line("**Location:** {$location}")
            ->line("**Date/Time Sighted:** {$sightedAt}");

        if ($this->sighting->description) {
            $mail->line("**Description:** {$this->sighting->description}");
        }

        if ($this->sighting->image_path) {
            $mail->line('**Photo:** Attached to the report');
        }

        $mail->action('View Sighting Report', url("/sightings/{$this->sighting->id}"))
            ->line('Please review this sighting report and verify the information.')
            ->line('If the AI has processed the image, the similarity score will be available in the sighting details.')
            ->salutation('Regards, Missing Person Detection System');

        return $mail;
    }

    /**
     * Get the array representation of the notification for the database.
     */
    public function toArray(object $notifiable): array
    {
        $person = $this->sighting->missingPerson;

        return [
            'type' => 'new_sighting_report',
            'sighting_id' => $this->sighting->id,
            'missing_person_id' => $this->sighting->missing_person_id,
            'person_name' => $person ? "{$person->first_name} {$person->last_name}" : 'Unknown',
            'case_number' => $person?->case_number,
            'reporter_name' => $this->sighting->reporter_name,
            'location_address' => $this->sighting->location_address,
            'latitude' => $this->sighting->latitude,
            'longitude' => $this->sighting->longitude,
            'sighted_at' => $this->sighting->sighted_at?->toISOString(),
            'status' => $this->sighting->status,
            'has_image' => !empty($this->sighting->image_path),
            'message' => "New sighting report from {$this->sighting->reporter_name} for {$person?->first_name} {$person?->last_name}",
        ];
    }
}