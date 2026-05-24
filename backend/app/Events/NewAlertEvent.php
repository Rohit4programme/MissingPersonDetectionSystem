<?php

namespace App\Events;

use App\Models\Alert;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewAlertEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public readonly Alert $alert,
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->alert->user_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'alert.new';
    }

    /**
     * Get the data to broadcast with the event.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'alert' => [
                'id' => $this->alert->id,
                'type' => $this->alert->type,
                'title' => $this->alert->title,
                'message' => $this->alert->message,
                'priority' => $this->alert->priority,
                'channel' => $this->alert->channel,
                'is_read' => $this->alert->is_read,
                'detection_id' => $this->alert->detection_id,
                'missing_person_id' => $this->alert->missing_person_id,
                'created_at' => $this->alert->created_at->toIso8601String(),
            ],
        ];
    }
}
