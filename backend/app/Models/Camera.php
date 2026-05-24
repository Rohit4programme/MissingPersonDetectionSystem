<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Camera extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     */
    protected $table = 'cameras';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'rtsp_url',
        'ip_address',
        'location_name',
        'latitude',
        'longitude',
        'type',
        'status',
        'is_public',
        'jurisdiction',
        'last_health_check',
        'fps',
        'resolution',
        'created_by',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_public' => 'boolean',
            'latitude' => 'float',
            'longitude' => 'float',
            'last_health_check' => 'datetime',
        ];
    }

    // ──────────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────────

    /**
     * Scope: only active cameras.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope: filter by camera type.
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    // ──────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────

    /**
     * The user who created this camera record.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Detections made by this camera.
     */
    public function detections(): HasMany
    {
        return $this->hasMany(Detection::class, 'camera_id');
    }
}
