<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, HasRoles;

    /**
     * The table associated with the model.
     */
    protected $table = 'users';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'badge_number',
        'department',
        'jurisdiction',
        'phone',
        'avatar',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    // ──────────────────────────────────────────────
    // Role helper methods
    // ──────────────────────────────────────────────

    public function isPublic(): bool
    {
        return $this->role === 'public';
    }

    public function isOfficer(): bool
    {
        return $this->role === 'officer';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    // ──────────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────────

    /**
     * Missing persons created by this user.
     */
    public function createdMissingPersons(): HasMany
    {
        return $this->hasMany(MissingPerson::class, 'created_by');
    }

    /**
     * Missing persons assigned to this user (as officer).
     */
    public function assignedMissingPersons(): HasMany
    {
        return $this->hasMany(MissingPerson::class, 'assigned_officer_id');
    }

    /**
     * Sightings reported by this user.
     */
    public function sightings(): HasMany
    {
        return $this->hasMany(Sighting::class, 'reporter_id');
    }

    /**
     * Evidence files uploaded by this user.
     */
    public function evidenceFiles(): HasMany
    {
        return $this->hasMany(EvidenceFile::class, 'uploaded_by');
    }

    /**
     * Audit logs associated with this user.
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'user_id');
    }
}
