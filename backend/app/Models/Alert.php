<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alert extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'alerts';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'detection_id',
        'person_id',
        'alert_type',
        'channel',
        'recipient_id',
        'message',
        'is_read',
        'sent_at',
        'read_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'sent_at' => 'datetime',
            'read_at' => 'datetime',
        ];
    }

    // ──────────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────────

    /**
     * Scope: only unread alerts.
     */
    public function scopeUnread(Builder $query): Builder
    {
        return $query->where('is_read', false);
    }

    /**
     * Scope: filter by delivery channel.
     */
    public function scopeByChannel(Builder $query, string $channel): Builder
    {
        return $query->where('channel', $channel);
    }

    // ──────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────

    /**
     * The detection that triggered this alert.
     */
    public function detection(): BelongsTo
    {
        return $this->belongsTo(Detection::class, 'detection_id');
    }

    /**
     * The missing person this alert is about.
     */
    public function missingPerson(): BelongsTo
    {
        return $this->belongsTo(MissingPerson::class, 'person_id');
    }

    /**
     * The user who received this alert.
     */
    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }
}
