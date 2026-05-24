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
        Schema::create('detections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('person_id')->constrained('missing_persons')->cascadeOnDelete();
            $table->foreignId('camera_id')->nullable()->constrained('cameras')->nullOnDelete();
            $table->unsignedBigInteger('sighting_id')->nullable();
            $table->decimal('confidence_score', 5, 4);
            $table->string('screenshot_path')->nullable();
            $table->json('bounding_box')->nullable();
            $table->timestamp('frame_timestamp')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('location_name')->nullable();
            $table->enum('source', ['cctv', 'public_upload', 'officer_upload'])->default('cctv');
            $table->boolean('is_verified')->default(false);
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('ai_metadata')->nullable();
            $table->timestamps();

            // Indexes for frequent queries
            $table->index('person_id');
            $table->index('camera_id');
            $table->index('confidence_score');
            $table->index('is_verified');
            $table->index('source');
            $table->index('latitude');
            $table->index('longitude');
            $table->index('created_at');
            $table->index(['person_id', 'confidence_score']);
            $table->index(['latitude', 'longitude']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('detections');
    }
};
