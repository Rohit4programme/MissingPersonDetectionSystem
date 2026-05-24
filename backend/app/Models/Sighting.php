<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sighting extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     */
    protected $table = 'sightings';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'person_id',
        'reporter_id',
        'reporter_name',
        'reporter_phone',
        'reporter_email',
        'is_anonymous',
        'latitude',
        'longitude',
        'location_name',
        'image_path',
        'video_path',
        'notes',
        'device_info',
        'status',
        'verified_by',
        'ai_similarity_score',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'device_info' => 'array',
            'is_anonymous' => 'boolean',
            'ai_similarity_score' => 'float',
        ];
    }

    // ──────────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────────

    /**
     * Scope: only pending sightings.
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope: only verified sightings.
     */
    public function scopeVerified(Builder $query): Builder
    {
        return $query->where('status', 'verified');
    }

    /**
     * Scope: filter by status.
     */
    public function scopeByStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    // ──────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────

    /**
     * The missing person this sighting is about.
     */
    public function missingPerson(): BelongsTo
    {
        return $this->belongsTo(MissingPerson::class, 'person_id');
    }

    /**
     * The user who reported this sighting.
     */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    /**
     * The user who verified this sighting.
     */
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * The AI detection associated with this sighting.
     */
    public function detection(): HasOne
    {
        return $this->hasOne(Detection::class, 'sighting_id');
    }
}
