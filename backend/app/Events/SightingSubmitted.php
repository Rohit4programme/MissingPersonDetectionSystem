<?php

namespace App\Events;

use App\Models\Sighting;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SightingSubmitted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public Sighting $sighting
    ) {}

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('private-sightings'),
        ];
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'sighting' => [
                'id' => $this->sighting->id,
                'missing_person_id' => $this->sighting->missing_person_id,
                'reporter_name' => $this->sighting->reporter_name,
                'location_address' => $this->sighting->location_address,
                'latitude' => $this->sighting->latitude,
                'longitude' => $this->sighting->longitude,
                'sighted_at' => $this->sighting->sighted_at?->toISOString(),
                'status' => $this->sighting->status,
                'ai_similarity_score' => $this->sighting->ai_similarity_score,
                'created_at' => $this->sighting->created_at?->toISOString(),
                'person' => $this->sighting->missingPerson ? [
                    'id' => $this->sighting->missingPerson->id,
                    'first_name' => $this->sighting->missingPerson->first_name,
                    'last_name' => $this->sighting->missingPerson->last_name,
                    'case_number' => $this->sighting->missingPerson->case_number,
                ] : null,
            ],
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'sighting.submitted';
    }
}