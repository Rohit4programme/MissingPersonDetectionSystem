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
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('detection_id')->nullable()->constrained('detections')->nullOnDelete();
            $table->foreignId('person_id')->constrained('missing_persons')->cascadeOnDelete();
            $table->enum('alert_type', ['face_match', 'sighting', 'cctv_detection', 'high_confidence']);
            $table->enum('channel', ['sms', 'email', 'push', 'dashboard', 'whatsapp']);
            $table->foreignId('recipient_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            // Indexes for frequent queries
            $table->index('person_id');
            $table->index('alert_type');
            $table->index('channel');
            $table->index('is_read');
            $table->index('recipient_id');
            $table->index('sent_at');
            $table->index('created_at');
            $table->index(['recipient_id', 'is_read']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};
