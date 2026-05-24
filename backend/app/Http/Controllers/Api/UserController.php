<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    /**
     * List users with filters (admin only).
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'role' => 'sometimes|string|in:public,officer,admin,super_admin',
                'is_active' => 'sometimes|boolean',
                'department' => 'sometimes|string|max:255',
                'jurisdiction' => 'sometimes|string|max:255',
                'search' => 'sometimes|string|min:2|max:255',
                'sort_by' => 'sometimes|string|in:name,email,created_at,role',
                'sort_order' => 'sometimes|string|in:asc,desc',
                'per_page' => 'sometimes|integer|min:1|max:100',
            ]);

            $query = User::query();

            if (!empty($validated['role'])) {
                $query->where('role', $validated['role']);
            }

            if (isset($validated['is_active'])) {
                $query->where('is_active', $validated['is_active']);
            }

            if (!empty($validated['department'])) {
                $query->where('department', $validated['department']);
            }

            if (!empty($validated['jurisdiction'])) {
                $query->where('jurisdiction', $validated['jurisdiction']);
            }

            if (!empty($validated['search'])) {
                $search = $validated['search'];
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('email', 'LIKE', "%{$search}%")
                      ->orWhere('badge_number', 'LIKE', "%{$search}%");
                });
            }

            $sortBy = $validated['sort_by'] ?? 'created_at';
            $sortOrder = $validated['sort_order'] ?? 'desc';
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $validated['per_page'] ?? 15;
            $users = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $users->items(),
                'message' => 'Users retrieved successfully.',
                'meta' => [
                    'current_page' => $users->currentPage(),
                    'last_page' => $users->lastPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to list users.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve users.',
            ], 500);
        }
    }

    /**
     * Create a new user (admin only).
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => ['required', 'string', 'min:8', 'confirmed', Password::defaults()],
                'role' => 'required|string|in:public,officer,admin,super_admin',
                'badge_number' => 'sometimes|nullable|string|max:50',
                'department' => 'sometimes|nullable|string|max:255',
                'jurisdiction' => 'sometimes|nullable|string|max:255',
                'phone' => 'sometimes|nullable|string|max:20',
                'is_active' => 'sometimes|boolean',
            ]);

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => $validated['role'],
                'badge_number' => $validated['badge_number'] ?? null,
                'department' => $validated['department'] ?? null,
                'jurisdiction' => $validated['jurisdiction'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            Log::info('User created by admin.', [
                'user_id' => $user->id,
                'created_by' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'data' => $user,
                'message' => 'User created successfully.',
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to create user.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create user.',
            ], 500);
        }
    }

    /**
     * Show a single user.
     */
    public function show($id): JsonResponse
    {
        try {
            $user = User::withCount(['createdMissingPersons', 'assignedMissingPersons', 'sightings'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $user,
                'message' => 'User retrieved successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve user.', ['user_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve user.',
            ], 500);
        }
    }

    /**
     * Update user details (admin only).
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'email' => 'sometimes|email|unique:users,email,' . $user->id,
                'role' => 'sometimes|string|in:public,officer,admin,super_admin',
                'badge_number' => 'sometimes|nullable|string|max:50',
                'department' => 'sometimes|nullable|string|max:255',
                'jurisdiction' => 'sometimes|nullable|string|max:255',
                'phone' => 'sometimes|nullable|string|max:20',
                'is_active' => 'sometimes|boolean',
                'password' => ['sometimes', 'nullable', 'string', 'min:8', 'confirmed', Password::defaults()],
            ]);

            if (isset($validated['password'])) {
                $validated['password'] = Hash::make($validated['password']);
            } else {
                unset($validated['password']);
            }

            $user->update($validated);

            Log::info('User updated by admin.', [
                'user_id' => $user->id,
                'updated_by' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'data' => $user->fresh(),
                'message' => 'User updated successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to update user.', ['user_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to update user.',
            ], 500);
        }
    }

    /**
     * Soft delete a user (admin only).
     */
    public function destroy($id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);

            // Prevent self-deletion
            if ($user->id === request()->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You cannot delete your own account.',
                ], 422);
            }

            $user->delete();

            Log::info('User deleted by admin.', [
                'user_id' => $id,
                'deleted_by' => request()->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'User deleted successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to delete user.', ['user_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete user.',
            ], 500);
        }
    }

    /**
     * Get list of officers (for assignment dropdowns).
     */
    public function getOfficers(Request $request): JsonResponse
    {
        try {
            $officers = User::whereIn('role', ['officer', 'admin'])
                ->where('is_active', true)
                ->select('id', 'name', 'email', 'badge_number', 'department', 'jurisdiction')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $officers,
                'message' => 'Officers retrieved successfully.',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve officers.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve officers.',
            ], 500);
        }
    }
}
