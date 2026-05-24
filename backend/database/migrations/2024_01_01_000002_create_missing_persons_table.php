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
        Schema::create('missing_persons', function (Blueprint $table) {
            $table->id();
            $table->string('case_number')->unique();
            $table->string('full_name');
            $table->integer('age');
            $table->enum('gender', ['male', 'female', 'other']);
            $table->decimal('height', 5, 2)->nullable();
            $table->decimal('weight', 5, 2)->nullable();
            $table->string('last_seen_location');
            $table->decimal('last_seen_lat', 10, 7)->nullable();
            $table->decimal('last_seen_lng', 10, 7)->nullable();
            $table->date('last_seen_date');
            $table->text('physical_description');
            $table->text('medical_conditions')->nullable();
            $table->text('clothing_description')->nullable();
            $table->string('guardian_name')->nullable();
            $table->string('guardian_phone')->nullable();
            $table->json('contact_numbers');
            $table->string('aadhaar_number')->nullable();
            $table->string('passport_number')->nullable();
            $table->string('photo');
            $table->json('additional_photos')->nullable();
            $table->string('fir_number')->nullable();
            $table->string('police_station')->nullable();
            $table->enum('status', ['missing', 'under_investigation', 'detected', 'found_safe', 'closed'])->default('missing');
            $table->enum('priority_level', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->decimal('risk_score', 5, 2)->default(0);
            $table->foreignId('assigned_officer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes for frequent queries
            $table->index('status');
            $table->index('priority_level');
            $table->index('last_seen_date');
            $table->index('last_seen_lat');
            $table->index('last_seen_lng');
            $table->index('risk_score');
            $table->index('created_at');
            $table->index(['status', 'priority_level']);
            $table->index(['last_seen_lat', 'last_seen_lng']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('missing_persons');
    }
};
