<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaseTimeline extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'case_timelines';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'case_id',
        'user_id',
        'action',
        'description',
        'metadata',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    // ──────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────

    /**
     * The missing person case this timeline entry belongs to.
     */
    public function case(): BelongsTo
    {
        return $this->belongsTo(MissingPerson::class, 'case_id');
    }

    /**
     * The user who performed this action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
