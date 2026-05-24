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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->enum('role', ['public', 'officer', 'admin', 'super_admin'])->default('public');
            $table->string('badge_number')->nullable();
            $table->string('department')->nullable();
            $table->string('jurisdiction')->nullable();
            $table->string('phone')->nullable();
            $table->string('avatar')->nullable();
            $table->boolean('is_active')->default(true);
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();

            // Indexes for frequent queries
            $table->index('role');
            $table->index('is_active');
            $table->index('jurisdiction');
            $table->index('department');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
