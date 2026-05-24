<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EvidenceFile extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     */
    protected $table = 'evidence_files';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'case_id',
        'uploaded_by',
        'file_path',
        'file_name',
        'file_type',
        'file_size',
        'mime_type',
        'description',
        'is_watermarked',
        'hash',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_watermarked' => 'boolean',
        ];
    }

    // ──────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────

    /**
     * The missing person case this evidence belongs to.
     */
    public function case(): BelongsTo
    {
        return $this->belongsTo(MissingPerson::class, 'case_id');
    }

    /**
     * The user who uploaded this evidence file.
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
