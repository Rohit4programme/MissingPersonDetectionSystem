<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FaceEmbedding extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'face_embeddings';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'person_id',
        'embedding_vector',
        'image_path',
        'quality_score',
        'is_primary',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'embedding_vector' => 'array',
            'is_primary' => 'boolean',
            'quality_score' => 'float',
        ];
    }

    // ──────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────

    /**
     * The missing person this embedding belongs to.
     */
    public function missingPerson(): BelongsTo
    {
        return $this->belongsTo(MissingPerson::class, 'person_id');
    }
}
