<?php

namespace App\Policies;

use App\Models\Sighting;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SightingPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any sightings.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['officer', 'admin', 'super_admin']);
    }

    /**
     * Determine whether the user can view the sighting.
     */
    public function view(User $user, Sighting $sighting): bool
    {
        // Reporter can view their own sighting
        if ($sighting->reporter_email === $user->email) {
            return true;
        }

        // Officers and admins can view all
        return in_array($user->role, ['officer', 'admin', 'super_admin']);
    }

    /**
     * Determine whether the user can create sightings.
     *
     * Anyone can submit a sighting report (public endpoint).
     */
    public function create(?User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the sighting.
     */
    public function update(User $user, Sighting $sighting): bool
    {
        // Admin can always update
        if (in_array($user->role, ['admin', 'super_admin'])) {
            return true;
        }

        // Officers can update
        if ($user->role === 'officer') {
            return true;
        }

        // Reporter can update their own if still pending
        if ($sighting->reporter_email === $user->email && $sighting->status === 'pending') {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can verify the sighting.
     */
    public function verify(User $user, Sighting $sighting): bool
    {
        return in_array($user->role, ['officer', 'admin', 'super_admin']);
    }

    /**
     * Determine whether the user can delete the sighting.
     */
    public function delete(User $user, Sighting $sighting): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can restore the sighting.
     */
    public function restore(User $user, Sighting $sighting): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can permanently delete the sighting.
     */
    public function forceDelete(User $user, Sighting $sighting): bool
    {
        return $user->role === 'super_admin';
    }
}
