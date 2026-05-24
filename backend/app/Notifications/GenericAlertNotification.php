<?php

namespace App\Notifications;

use App\Models\Alert;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class GenericAlertNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public readonly Alert $alert,
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
        return (new MailMessage)
            ->subject($this->alert->title)
            ->greeting("Hello {$notifiable->name},")
            ->line($this->alert->message)
            ->action('View Alert', url("/alerts/{$this->alert->id}"))
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
            'type' => 'generic_alert',
            'alert_id' => $this->alert->id,
            'alert_type' => $this->alert->type,
            'title' => $this->alert->title,
            'message' => $this->alert->message,
            'priority' => $this->alert->priority,
            'detection_id' => $this->alert->detection_id,
            'missing_person_id' => $this->alert->missing_person_id,
            'link' => "/alerts/{$this->alert->id}",
        ];
    }
}
