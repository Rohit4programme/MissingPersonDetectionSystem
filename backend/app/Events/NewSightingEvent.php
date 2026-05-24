<?php

namespace App\Events;

use App\Models\Sighting;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewSightingEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public readonly Sighting $sighting,
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('sightings'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'sighting.new';
    }

    /**
     * Get the data to broadcast with the event.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'sighting' => [
                'id' => $this->sighting->id,
                'missing_person_id' => $this->sighting->missing_person_id,
                'status' => $this->sighting->status,
                'location' => $this->sighting->location,
                'latitude' => $this->sighting->latitude,
                'longitude' => $this->sighting->longitude,
                'sighted_at' => $this->sighting->sighted_at?->toIso8601String(),
                'ai_similarity_score' => $this->sighting->ai_similarity_score,
                'is_anonymous' => $this->sighting->is_anonymous,
                'reporter_name' => $this->sighting->is_anonymous
                    ? 'Anonymous'
                    : $this->sighting->reporter?->name,
                'created_at' => $this->sighting->created_at->toIso8601String(),
            ],
        ];
    }
}
