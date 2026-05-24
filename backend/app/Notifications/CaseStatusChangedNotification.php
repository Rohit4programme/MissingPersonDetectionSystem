<?php

namespace App\Notifications;

use App\Models\MissingPerson;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CaseStatusChangedNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public readonly MissingPerson $case,
        public readonly string $oldStatus,
        public readonly string $newStatus,
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
        $statusLabels = [
            'missing' => 'Missing',
            'under_investigation' => 'Under Investigation',
            'detected' => 'Detected',
            'found_safe' => 'Found Safe',
            'found_deceased' => 'Found Deceased',
            'closed' => 'Closed',
        ];

        $oldStatusLabel = $statusLabels[$this->oldStatus] ?? ucfirst(str_replace('_', ' ', $this->oldStatus));
        $newStatusLabel = $statusLabels[$this->newStatus] ?? ucfirst(str_replace('_', ' ', $this->newStatus));

        return (new MailMessage)
            ->subject("Case {$this->case->case_number} Status Updated")
            ->greeting("Hello {$notifiable->name},")
            ->line("The status of case **{$this->case->case_number}** for **{$this->case->full_name}** has been updated.")
            ->line("**Previous Status:** {$oldStatusLabel}")
            ->line("**New Status:** {$newStatusLabel}")
            ->line("**Case Priority:** {$this->case->priority}")
            ->action('View Case', url("/cases/{$this->case->id}"))
            ->line('Please review the case for any necessary follow-up actions.')
            ->salutation('Regards, Missing Person Detection System');
    }

    /**
     * Get the array representation of the notification stored in the database.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'case_status_changed',
            'case_id' => $this->case->id,
            'case_number' => $this->case->case_number,
            'person_name' => $this->case->full_name,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'priority' => $this->case->priority,
            'link' => "/cases/{$this->case->id}",
        ];
    }
}
