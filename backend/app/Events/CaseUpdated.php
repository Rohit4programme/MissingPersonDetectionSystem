<?php

namespace App\Events;

use App\Models\MissingPerson;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CaseUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public MissingPerson $case,
        public array $updatedFields = []
    ) {}

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('private-cases'),
        ];
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'case' => [
                'id' => $this->case->id,
                'case_number' => $this->case->case_number,
                'first_name' => $this->case->first_name,
                'last_name' => $this->case->last_name,
                'status' => $this->case->status,
                'priority' => $this->case->priority,
                'assigned_officer_id' => $this->case->assigned_officer_id,
                'updated_at' => $this->case->updated_at?->toISOString(),
                'updated_fields' => $this->updatedFields,
                'assigned_officer' => $this->case->assignedOfficer ? [
                    'id' => $this->case->assignedOfficer->id,
                    'name' => $this->case->assignedOfficer->name,
                ] : null,
            ],
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'case.updated';
    }
}