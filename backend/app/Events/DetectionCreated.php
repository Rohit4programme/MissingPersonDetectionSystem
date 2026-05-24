<?php

namespace App\Events;

use App\Models\Detection;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DetectionCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public Detection $detection
    ) {}

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('private-detections'),
        ];

        // Also broadcast to the assigned officer's personal channel
        if ($this->detection->missingPerson?->assigned_officer_id) {
            $channels[] = new PrivateChannel('private-user.' . $this->detection->missingPerson->assigned_officer_id);
        }

        return $channels;
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'detection' => [
                'id' => $this->detection->id,
                'missing_person_id' => $this->detection->missing_person_id,
                'confidence_score' => $this->detection->confidence_score,
                'source' => $this->detection->source,
                'latitude' => $this->detection->latitude,
                'longitude' => $this->detection->longitude,
                'location_address' => $this->detection->location_address,
                'screenshot_path' => $this->detection->screenshot_path,
                'detected_at' => $this->detection->detected_at?->toISOString(),
                'is_verified' => $this->detection->is_verified,
                'person' => $this->detection->missingPerson ? [
                    'id' => $this->detection->missingPerson->id,
                    'first_name' => $this->detection->missingPerson->first_name,
                    'last_name' => $this->detection->missingPerson->last_name,
                    'status' => $this->detection->missingPerson->status,
                ] : null,
                'camera' => $this->detection->camera ? [
                    'id' => $this->detection->camera->id,
                    'name' => $this->detection->camera->name,
                    'location_name' => $this->detection->camera->location_name,
                ] : null,
            ],
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'detection.created';
    }
}