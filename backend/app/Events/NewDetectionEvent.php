<?php

namespace App\Events;

use App\Models\Detection;
use App\Models\MissingPerson;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewDetectionEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public readonly Detection $detection,
        public readonly MissingPerson $person,
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('detections'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'detection.new';
    }

    /**
     * Get the data to broadcast with the event.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'detection' => [
                'id' => $this->detection->id,
                'missing_person_id' => $this->detection->missing_person_id,
                'source' => $this->detection->source,
                'confidence' => $this->detection->confidence,
                'location' => $this->detection->location,
                'latitude' => $this->detection->latitude,
                'longitude' => $this->detection->longitude,
                'screenshot_path' => $this->detection->screenshot_path,
                'detected_at' => $this->detection->detected_at?->toIso8601String(),
                'is_verified' => $this->detection->is_verified,
                'created_at' => $this->detection->created_at->toIso8601String(),
            ],
            'person' => [
                'id' => $this->person->id,
                'case_number' => $this->person->case_number,
                'full_name' => $this->person->full_name,
                'age' => $this->person->age,
                'photo_url' => $this->person->photo_path,
                'status' => $this->person->status,
            ],
        ];
    }
}
