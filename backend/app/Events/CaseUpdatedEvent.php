<?php

namespace App\Events;

use App\Models\MissingPerson;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CaseUpdatedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public readonly MissingPerson $case,
        public readonly string $action,
        public readonly User $user,
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('cases.' . $this->case->id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'case.updated';
    }

    /**
     * Get the data to broadcast with the event.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'case' => [
                'id' => $this->case->id,
                'case_number' => $this->case->case_number,
                'full_name' => $this->case->full_name,
                'status' => $this->case->status,
                'priority' => $this->case->priority,
                'updated_at' => $this->case->updated_at->toIso8601String(),
            ],
            'action' => $this->action,
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'role' => $this->user->role,
            ],
        ];
    }
}
