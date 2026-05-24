<?php

namespace App\Notifications;

use App\Models\MissingPerson;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CaseStatusChanged extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public MissingPerson $case,
        public string $oldStatus,
        public string $newStatus
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
        $statusLabels = [
            'missing' => 'Missing',
            'detected' => 'Detected',
            'found' => 'Found',
            'closed' => 'Closed',
        ];

        $oldLabel = $statusLabels[$this->oldStatus] ?? ucfirst($this->oldStatus);
        $newLabel = $statusLabels[$this->newStatus] ?? ucfirst($this->newStatus);

        return (new MailMessage)
            ->subject("Case Status Update: {$this->case->case_number}")
            ->greeting("Dear {$notifiable->first_name},")
            ->line("The status of missing person case **{$this->case->case_number}** has been updated.")
            ->line("**Person:** {$this->case->first_name} {$this->case->last_name}")
            ->line("**Previous Status:** {$oldLabel}")
            ->line("**New Status:** {$newLabel}")
            ->line("**Case Priority:** " . ucfirst($this->case->priority ?? 'normal'))
            ->line("**Last Seen:** {$this->case->last_seen_location}")
            ->line("**Last Seen Date:** " . ($this->case->last_seen_at ? $this->case->last_seen_at->format('M d, Y') : 'Unknown'))
            ->action('View Case Details', url("/cases/{$this->case->id}"))
            ->line('Please review the case details and take appropriate action.')
            ->salutation('Regards, Missing Person Detection System');
    }

    /**
     * Get the array representation of the notification for the database.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'case_status_changed',
            'case_id' => $this->case->id,
            'case_number' => $this->case->case_number,
            'person_name' => "{$this->case->first_name} {$this->case->last_name}",
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'priority' => $this->case->priority,
            'message' => "Case {$this->case->case_number} status changed from {$this->oldStatus} to {$this->newStatus}",
        ];
    }
}