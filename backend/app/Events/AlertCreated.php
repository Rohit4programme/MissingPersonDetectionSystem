<?php

namespace App\Events;

use App\Models\Alert;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AlertCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public Alert $alert
    ) {}

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('private-user.' . $this->alert->recipient_id),
        ];
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'alert' => [
                'id' => $this->alert->id,
                'detection_id' => $this->alert->detection_id,
                'missing_person_id' => $this->alert->missing_person_id,
                'alert_type' => $this->alert->alert_type,
                'priority' => $this->alert->priority,
                'title' => $this->alert->title,
                'message' => $this->alert->message,
                'confidence_score' => $this->alert->confidence_score,
                'latitude' => $this->alert->latitude,
                'longitude' => $this->alert->longitude,
                'location_address' => $this->alert->location_address,
                'is_read' => $this->alert->is_read,
                'created_at' => $this->alert->created_at?->toISOString(),
                'detection' => $this->alert->detection ? [
                    'id' => $this->alert->detection->id,
                    'source' => $this->alert->detection->source,
                    'detected_at' => $this->alert->detection->detected_at?->toISOString(),
                ] : null,
                'person' => $this->alert->missingPerson ? [
                    'id' => $this->alert->missingPerson->id,
                    'first_name' => $this->alert->missingPerson->first_name,
                    'last_name' => $this->alert->missingPerson->last_name,
                    'status' => $this->alert->missingPerson->status,
                    'photo_url' => $this->alert->missingPerson->primary_photo_url,
                ] : null,
            ],
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'alert.created';
    }
}