<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Jurisdiction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class JurisdictionController extends Controller
{
    /**
     * List jurisdictions.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'state' => 'sometimes|string|max:255',
                'district' => 'sometimes|string|max:255',
                'search' => 'sometimes|string|min:2|max:255',
                'sort_by' => 'sometimes|string|in:name,state,district,created_at',
                'sort_order' => 'sometimes|string|in:asc,desc',
                'per_page' => 'sometimes|integer|min:1|max:100',
            ]);

            $query = Jurisdiction::with('creator');

            if (!empty($validated['state'])) {
                $query->where('state', $validated['state']);
            }

            if (!empty($validated['district'])) {
                $query->where('district', $validated['district']);
            }

            if (!empty($validated['search'])) {
                $search = $validated['search'];
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('code', 'LIKE', "%{$search}%")
                      ->orWhere('state', 'LIKE', "%{$search}%")
                      ->orWhere('district', 'LIKE', "%{$search}%");
                });
            }

            $sortBy = $validated['sort_by'] ?? 'name';
            $sortOrder = $validated['sort_order'] ?? 'asc';
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $validated['per_page'] ?? 15;
            $jurisdictions = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $jurisdictions->items(),
                'message' => 'Jurisdictions retrieved successfully.',
                'meta' => [
                    'current_page' => $jurisdictions->currentPage(),
                    'last_page' => $jurisdictions->lastPage(),
                    'per_page' => $jurisdictions->perPage(),
                    'total' => $jurisdictions->total(),
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to list jurisdictions.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve jurisdictions.',
            ], 500);
        }
    }

    /**
     * Create a new jurisdiction.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => 'required|string|max:50|unique:jurisdictions,code',
                'state' => 'required|string|max:255',
                'district' => 'required|string|max:255',
                'boundaries' => 'sometimes|nullable|array',
            ]);

            $jurisdiction = Jurisdiction::create([
                'name' => $validated['name'],
                'code' => $validated['code'],
                'state' => $validated['state'],
                'district' => $validated['district'],
                'boundaries' => $validated['boundaries'] ?? [],
                'created_by' => $request->user()->id,
            ]);

            Log::info('Jurisdiction created.', [
                'jurisdiction_id' => $jurisdiction->id,
                'code' => $jurisdiction->code,
            ]);

            $jurisdiction->load('creator');

            return response()->json([
                'success' => true,
                'data' => $jurisdiction,
                'message' => 'Jurisdiction created successfully.',
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to create jurisdiction.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create jurisdiction.',
            ], 500);
        }
    }

    /**
     * Show a single jurisdiction.
     */
    public function show($id): JsonResponse
    {
        try {
            $jurisdiction = Jurisdiction::with('creator')->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $jurisdiction,
                'message' => 'Jurisdiction retrieved successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Jurisdiction not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve jurisdiction.', ['jurisdiction_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve jurisdiction.',
            ], 500);
        }
    }

    /**
     * Update a jurisdiction.
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $jurisdiction = Jurisdiction::findOrFail($id);

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'code' => 'sometimes|string|max:50|unique:jurisdictions,code,' . $jurisdiction->id,
                'state' => 'sometimes|string|max:255',
                'district' => 'sometimes|string|max:255',
                'boundaries' => 'sometimes|nullable|array',
            ]);

            $jurisdiction->update($validated);

            Log::info('Jurisdiction updated.', ['jurisdiction_id' => $jurisdiction->id]);

            return response()->json([
                'success' => true,
                'data' => $jurisdiction->fresh()->load('creator'),
                'message' => 'Jurisdiction updated successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Jurisdiction not found.',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to update jurisdiction.', ['jurisdiction_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to update jurisdiction.',
            ], 500);
        }
    }

    /**
     * Delete a jurisdiction.
     */
    public function destroy($id): JsonResponse
    {
        try {
            $jurisdiction = Jurisdiction::findOrFail($id);
            $jurisdiction->delete();

            Log::info('Jurisdiction deleted.', [
                'jurisdiction_id' => $id,
                'deleted_by' => request()->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'Jurisdiction deleted successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Jurisdiction not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to delete jurisdiction.', ['jurisdiction_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete jurisdiction.',
            ], 500);
        }
    }
}
