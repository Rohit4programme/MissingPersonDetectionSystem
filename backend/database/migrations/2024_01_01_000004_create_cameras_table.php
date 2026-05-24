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
        Schema::create('cameras', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('rtsp_url')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('location_name');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->enum('type', ['rtsp', 'ip', 'dvr', 'webcam'])->default('ip');
            $table->enum('status', ['active', 'inactive', 'maintenance'])->default('active');
            $table->boolean('is_public')->default(false);
            $table->string('jurisdiction')->nullable();
            $table->timestamp('last_health_check')->nullable();
            $table->integer('fps')->default(30);
            $table->string('resolution')->default('1920x1080');
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Indexes for frequent queries
            $table->index('status');
            $table->index('latitude');
            $table->index('longitude');
            $table->index('jurisdiction');
            $table->index('is_public');
            $table->index(['latitude', 'longitude']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cameras');
    }
};
