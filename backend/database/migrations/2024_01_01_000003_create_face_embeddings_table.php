<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('face_embeddings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('person_id')->constrained('missing_persons')->cascadeOnDelete();
            $table->longText('embedding_vector'); // JSON array of floats
            $table->string('image_path');
            $table->decimal('quality_score', 5, 4)->default(0);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            // Indexes
            $table->index('person_id');
            $table->index('is_primary');
            $table->index('quality_score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('face_embeddings');
    }
};
