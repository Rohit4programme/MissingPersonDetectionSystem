<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MissingPerson extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     */
    protected $table = 'missing_persons';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'case_number',
        'full_name',
        'age',
        'gender',
        'height',
        'weight',
        'last_seen_location',
        'last_seen_lat',
        'last_seen_lng',
        'last_seen_date',
        'physical_description',
        'medical_conditions',
        'clothing_description',
        'guardian_name',
        'guardian_phone',
        'contact_numbers',
        'aadhaar_number',
        'passport_number',
        'photo',
        'additional_photos',
        'fir_number',
        'police_station',
        'status',
        'priority_level',
        'risk_score',
        'assigned_officer_id',
        'created_by',
        'notes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'contact_numbers' => 'array',
            'additional_photos' => 'array',
            'last_seen_date' => 'date',
            'last_seen_lat' => 'float',
            'last_seen_lng' => 'float',
            'risk_score' => 'float',
        ];
    }

    // ──────────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────────

    /**
     * Scope: only active (non-closed) cases.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', '!=', 'closed');
    }

    /**
     * Scope: filter by status.
     */
    public function scopeByStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: high-risk cases (risk_score >= 70).
     */
    public function scopeHighRisk(Builder $query): Builder
    {
        return $query->where('risk_score', '>=', 70);
    }

    /**
     * Scope: filter by priority level.
     */
    public function scopeByPriority(Builder $query, string $level): Builder
    {
        return $query->where('priority_level', $level);
    }

    // ──────────────────────────────────────────────
    // Accessors
    // ──────────────────────────────────────────────

    /**
     * Get the full URL for the photo.
     */
    public function getPhotoUrlAttribute(): ?string
    {
        if (!$this->photo) {
            return null;
        }

        if (str_starts_with($this->photo, 'http')) {
            return $this->photo;
        }

        return url('storage/' . $this->photo);
    }

    // ──────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────

    /**
     * The user who created this case.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * The officer assigned to this case.
     */
    public function assignedOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_officer_id');
    }

    /**
     * Face embeddings for this missing person.
     */
    public function faceEmbeddings(): HasMany
    {
        return $this->hasMany(FaceEmbedding::class, 'person_id');
    }

    /**
     * AI detections of this missing person.
     */
    public function detections(): HasMany
    {
        return $this->hasMany(Detection::class, 'person_id');
    }

    /**
     * Public sightings of this missing person.
     */
    public function sightings(): HasMany
    {
        return $this->hasMany(Sighting::class, 'person_id');
    }

    /**
     * Evidence files attached to this case.
     */
    public function evidenceFiles(): HasMany
    {
        return $this->hasMany(EvidenceFile::class, 'case_id');
    }

    /**
     * Alerts generated for this missing person.
     */
    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class, 'person_id');
    }

    /**
     * Timeline entries for this case.
     */
    public function caseTimelines(): HasMany
    {
        return $this->hasMany(CaseTimeline::class, 'case_id');
    }
}
