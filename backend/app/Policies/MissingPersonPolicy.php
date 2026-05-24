<?php

namespace App\Policies;

use App\Models\MissingPerson;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Auth\Access\Response;

class MissingPersonPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any missing person cases.
     */
    public function viewAny(User $user): bool
    {
        return true; // All authenticated users can view the list
    }

    /**
     * Determine whether the user can view the missing person.
     */
    public function view(User $user, MissingPerson $missingPerson): bool
    {
        // Public users can only see missing status cases
        if ($user->role === 'public') {
            return $missingPerson->status === 'missing';
        }

        // Officers and admins can view all
        return in_array($user->role, ['officer', 'admin', 'super_admin']);
    }

    /**
     * Determine whether the user can create missing person cases.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['officer', 'admin', 'super_admin']);
    }

    /**
     * Determine whether the user can update the missing person.
     */
    public function update(User $user, MissingPerson $missingPerson): bool
    {
        // Admin can always update
        if (in_array($user->role, ['admin', 'super_admin'])) {
            return true;
        }

        // Assigned officer can update
        if ($user->role === 'officer' && $missingPerson->assigned_officer_id === $user->id) {
            return true;
        }

        // Creator can update
        if ($missingPerson->created_by === $user->id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the missing person.
     */
    public function delete(User $user, MissingPerson $missingPerson): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can update the case status.
     */
    public function updateStatus(User $user, MissingPerson $missingPerson): bool
    {
        // Admin can always update status
        if (in_array($user->role, ['admin', 'super_admin'])) {
            return true;
        }

        // Assigned officer can update status
        if ($user->role === 'officer' && $missingPerson->assigned_officer_id === $user->id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can assign an officer to the case.
     */
    public function assignOfficer(User $user, MissingPerson $missingPerson): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can restore the missing person.
     */
    public function restore(User $user, MissingPerson $missingPerson): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can permanently delete the missing person.
     */
    public function forceDelete(User $user, MissingPerson $missingPerson): bool
    {
        return $user->role === 'super_admin';
    }
}
