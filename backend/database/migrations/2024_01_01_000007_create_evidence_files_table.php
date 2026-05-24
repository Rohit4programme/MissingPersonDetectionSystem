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
        Schema::create('evidence_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('missing_persons')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->string('file_path');
            $table->string('file_name');
            $table->enum('file_type', ['image', 'video', 'audio', 'document']);
            $table->unsignedBigInteger('file_size');
            $table->string('mime_type');
            $table->text('description')->nullable();
            $table->boolean('is_watermarked')->default(false);
            $table->string('hash');
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('case_id');
            $table->index('file_type');
            $table->index('uploaded_by');
            $table->index('hash');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evidence_files');
    }
};
