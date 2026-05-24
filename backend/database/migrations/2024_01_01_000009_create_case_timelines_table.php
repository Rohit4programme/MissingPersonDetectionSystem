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
        Schema::create('case_timelines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('missing_persons')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('action');
            $table->text('description');
            $table->json('metadata')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('case_id');
            $table->index('user_id');
            $table->index('action');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('case_timelines');
    }
};
