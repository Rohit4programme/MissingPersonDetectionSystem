<?php

namespace App\Policies;

use App\Models\Detection;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class DetectionPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any detections.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['officer', 'admin', 'super_admin']);
    }

    /**
     * Determine whether the user can view the detection.
     */
    public function view(User $user, Detection $detection): bool
    {
        return in_array($user->role, ['officer', 'admin', 'super_admin']);
    }

    /**
     * Determine whether the user can create detections.
     *
     * Detections are primarily created by system jobs, but officers
     * can also manually create detections.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['officer', 'admin', 'super_admin']);
    }

    /**
     * Determine whether the user can verify the detection.
     *
     * Only the assigned officer or admin can verify detections.
     */
    public function verify(User $user, Detection $detection): bool
    {
        // Admin can always verify
        if (in_array($user->role, ['admin', 'super_admin'])) {
            return true;
        }

        // Assigned officer can verify
        if ($user->role === 'officer') {
            $assignedOfficerId = $detection->missingPerson?->assigned_officer_id;
            return $assignedOfficerId === $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can update the detection.
     */
    public function update(User $user, Detection $detection): bool
    {
        // Admin can always update
        if (in_array($user->role, ['admin', 'super_admin'])) {
            return true;
        }

        // Assigned officer can update
        if ($user->role === 'officer') {
            $assignedOfficerId = $detection->missingPerson?->assigned_officer_id;
            return $assignedOfficerId === $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the detection.
     */
    public function delete(User $user, Detection $detection): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can restore the detection.
     */
    public function restore(User $user, Detection $detection): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can permanently delete the detection.
     */
    public function forceDelete(User $user, Detection $detection): bool
    {
        return $user->role === 'super_admin';
    }
}
