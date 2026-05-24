<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Detection extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'detections';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'person_id',
        'camera_id',
        'sighting_id',
        'confidence_score',
        'screenshot_path',
        'bounding_box',
        'frame_timestamp',
        'latitude',
        'longitude',
        'location_name',
        'source',
        'is_verified',
        'verified_by',
        'ai_metadata',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'bounding_box' => 'array',
            'ai_metadata' => 'array',
            'confidence_score' => 'float',
            'is_verified' => 'boolean',
        ];
    }

    // ──────────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────────

    /**
     * Scope: only verified detections.
     */
    public function scopeVerified(Builder $query): Builder
    {
        return $query->where('is_verified', true);
    }

    /**
     * Scope: high-confidence detections above the given threshold.
     */
    public function scopeHighConfidence(Builder $query, float $threshold = 0.85): Builder
    {
        return $query->where('confidence_score', '>=', $threshold);
    }

    /**
     * Scope: filter by detection source.
     */
    public function scopeBySource(Builder $query, string $source): Builder
    {
        return $query->where('source', $source);
    }

    // ──────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────

    /**
     * The missing person detected.
     */
    public function missingPerson(): BelongsTo
    {
        return $this->belongsTo(MissingPerson::class, 'person_id');
    }

    /**
     * The camera that made the detection.
     */
    public function camera(): BelongsTo
    {
        return $this->belongsTo(Camera::class, 'camera_id');
    }

    /**
     * The related sighting (if any).
     */
    public function sighting(): BelongsTo
    {
        return $this->belongsTo(Sighting::class, 'sighting_id');
    }

    /**
     * The user who verified this detection.
     */
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
