<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any users.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, User $model): bool
    {
        // Users can view their own profile
        if ($user->id === $model->id) {
            return true;
        }

        // Admin can view anyone
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can create users.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, User $model): bool
    {
        // Admin can update anyone
        if (in_array($user->role, ['admin', 'super_admin'])) {
            return true;
        }

        // Users can update their own profile (limited fields enforced in controller)
        if ($user->id === $model->id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, User $model): bool
    {
        // Cannot delete yourself
        if ($user->id === $model->id) {
            return false;
        }

        // Only admin can delete
        if (!in_array($user->role, ['admin', 'super_admin'])) {
            return false;
        }

        // Regular admins cannot delete super admins
        if ($user->role === 'admin' && $model->role === 'super_admin') {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, User $model): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, User $model): bool
    {
        return $user->role === 'super_admin';
    }

    /**
     * Determine whether the user can change roles.
     */
    public function changeRole(User $user, User $model): bool
    {
        // Only super admin can change roles
        if ($user->role !== 'super_admin') {
            return false;
        }

        // Cannot change your own role
        if ($user->id === $model->id) {
            return false;
        }

        return true;
    }
}
