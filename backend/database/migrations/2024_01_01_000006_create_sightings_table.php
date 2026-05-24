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
        Schema::create('sightings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('person_id')->constrained('missing_persons')->cascadeOnDelete();
            $table->foreignId('reporter_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reporter_name')->nullable();
            $table->string('reporter_phone')->nullable();
            $table->string('reporter_email')->nullable();
            $table->boolean('is_anonymous')->default(false);
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('location_name');
            $table->string('image_path')->nullable();
            $table->string('video_path')->nullable();
            $table->text('notes')->nullable();
            $table->json('device_info')->nullable();
            $table->enum('status', ['pending', 'verified', 'rejected', 'spam'])->default('pending');
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('ai_similarity_score', 5, 4)->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes for frequent queries
            $table->index('person_id');
            $table->index('status');
            $table->index('latitude');
            $table->index('longitude');
            $table->index('created_at');
            $table->index('is_anonymous');
            $table->index(['latitude', 'longitude']);
            $table->index(['person_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sightings');
    }
};
