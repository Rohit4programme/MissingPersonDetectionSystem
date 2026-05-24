<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MissingPerson;
use App\Models\TimelineEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class MissingPersonController extends Controller
{
    /**
     * List cases with filters and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'status' => 'sometimes|string|in:active,found,deceased,closed,pending',
                'priority' => 'sometimes|string|in:low,medium,high,critical',
                'gender' => 'sometimes|string|in:male,female,other',
                'age_min' => 'sometimes|integer|min:0',
                'age_max' => 'sometimes|integer|max:150',
                'latitude' => 'sometimes|numeric|between:-90,90',
                'longitude' => 'sometimes|numeric|between:-180,180',
                'radius' => 'sometimes|numeric|min:0.1|max:500', // km
                'sort_by' => 'sometimes|string|in:created_at,updated_at,priority,last_seen_at',
                'sort_order' => 'sometimes|string|in:asc,desc',
                'per_page' => 'sometimes|integer|min:1|max:100',
            ]);

            $query = MissingPerson::with(['assignedOfficer', 'creator'])
                ->select('missing_persons.*');

            if (!empty($validated['status'])) {
                $query->where('status', $validated['status']);
            }

            if (!empty($validated['priority'])) {
                $query->where('priority', $validated['priority']);
            }

            if (!empty($validated['gender'])) {
                $query->where('gender', $validated['gender']);
            }

            if (isset($validated['age_min'])) {
                $query->where('age', '>=', $validated['age_min']);
            }

            if (isset($validated['age_max'])) {
                $query->where('age', '<=', $validated['age_max']);
            }

            // Location radius search using Haversine formula
            if (!empty($validated['latitude']) && !empty($validated['longitude'])) {
                $radius = $validated['radius'] ?? 50; // Default 50km
                $lat = $validated['latitude'];
                $lng = $validated['longitude'];

                $query->selectRaw("
                    *, (6371 * acos(cos(radians(?)) * cos(radians(last_seen_latitude))
                    * cos(radians(last_seen_longitude) - radians(?))
                    + sin(radians(?)) * sin(radians(last_seen_latitude)))) AS distance
                ", [$lat, $lng, $lat])
                ->having('distance', '<=', $radius)
                ->orderBy('distance');
            }

            $sortBy = $validated['sort_by'] ?? 'created_at';
            $sortOrder = $validated['sort_order'] ?? 'desc';

            if (empty($validated['latitude'])) {
                $query->orderBy($sortBy, $sortOrder);
            }

            $perPage = $validated['per_page'] ?? 15;
            $cases = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $cases->items(),
                'message' => 'Cases retrieved successfully.',
                'meta' => [
                    'current_page' => $cases->currentPage(),
                    'last_page' => $cases->lastPage(),
                    'per_page' => $cases->perPage(),
                    'total' => $cases->total(),
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to list cases.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve cases.',
            ], 500);
        }
    }

    /**
     * Create a new missing person case.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'alias' => 'sometimes|nullable|string|max:255',
                'date_of_birth' => 'sometimes|nullable|date|before:today',
                'age' => 'required|integer|min:0|max:150',
                'gender' => 'required|string|in:male,female,other',
                'ethnicity' => 'sometimes|nullable|string|max:100',
                'height_cm' => 'sometimes|nullable|numeric|min:30|max:300',
                'weight_kg' => 'sometimes|nullable|numeric|min:2|max:500',
                'eye_color' => 'sometimes|nullable|string|max:50',
                'hair_color' => 'sometimes|nullable|string|max:50',
                'distinguishing_marks' => 'sometimes|nullable|string|max:1000',
                'last_seen_at' => 'required|date|before_or_equal:now',
                'last_seen_latitude' => 'required|numeric|between:-90,90',
                'last_seen_longitude' => 'required|numeric|between:-180,180',
                'last_seen_location' => 'required|string|max:500',
                'last_seen_clothing' => 'sometimes|nullable|string|max:1000',
                'description' => 'required|string|max:5000',
                'medical_conditions' => 'sometimes|nullable|string|max:2000',
                'priority' => 'sometimes|string|in:low,medium,high,critical',
                'assigned_officer_id' => 'sometimes|nullable|exists:users,id',
                'photos' => 'required|array|min:1|max:5',
                'photos.*' => 'image|mimes:jpeg,png,jpg|max:5120',
            ]);

            DB::beginTransaction();

            // Auto-generate case number: MP-YYYY-XXXXX
            $year = now()->format('Y');
            $lastCase = MissingPerson::where('case_number', 'like', "MP-{$year}-%")
                ->orderBy('case_number', 'desc')
                ->first();

            $sequence = $lastCase
                ? (int) substr($lastCase->case_number, -5) + 1
                : 1;

            $caseNumber = sprintf('MP-%s-%05d', $year, $sequence);

            // Save photos
            $photoPaths = [];
            if ($request->hasFile('photos')) {
                foreach ($request->file('photos') as $photo) {
                    $photoPaths[] = $photo->store("missing-persons/{$caseNumber}/photos", 'public');
                }
            }

            $case = MissingPerson::create([
                'case_number' => $caseNumber,
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'alias' => $validated['alias'] ?? null,
                'date_of_birth' => $validated['date_of_birth'] ?? null,
                'age' => $validated['age'],
                'gender' => $validated['gender'],
                'ethnicity' => $validated['ethnicity'] ?? null,
                'height_cm' => $validated['height_cm'] ?? null,
                'weight_kg' => $validated['weight_kg'] ?? null,
                'eye_color' => $validated['eye_color'] ?? null,
                'hair_color' => $validated['hair_color'] ?? null,
                'distinguishing_marks' => $validated['distinguishing_marks'] ?? null,
                'last_seen_at' => $validated['last_seen_at'],
                'last_seen_latitude' => $validated['last_seen_latitude'],
                'last_seen_longitude' => $validated['last_seen_longitude'],
                'last_seen_location' => $validated['last_seen_location'],
                'last_seen_clothing' => $validated['last_seen_clothing'] ?? null,
                'description' => $validated['description'],
                'medical_conditions' => $validated['medical_conditions'] ?? null,
                'priority' => $validated['priority'] ?? 'medium',
                'status' => 'active',
                'photos' => $photoPaths,
                'assigned_officer_id' => $validated['assigned_officer_id'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            // Create initial timeline entry
            TimelineEntry::create([
                'missing_person_id' => $case->id,
                'user_id' => $request->user()->id,
                'type' => 'case_created',
                'description' => "Case {$caseNumber} created for {$validated['first_name']} {$validated['last_name']}.",
                'metadata' => json_encode(['priority' => $case->priority]),
            ]);

            // Dispatch job to generate face embeddings
            if (!empty($photoPaths)) {
                \App\Jobs\GenerateFaceEmbeddings::dispatch($case->id, $photoPaths);
            }

            DB::commit();

            Log::info('Missing person case created.', ['case_id' => $case->id, 'case_number' => $caseNumber]);

            $case->load(['assignedOfficer', 'creator']);

            return response()->json([
                'success' => true,
                'data' => $case,
                'message' => "Case {$caseNumber} created successfully.",
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create case.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create case.',
            ], 500);
        }
    }

    /**
     * Show a case with all relationships.
     */
    public function show($id): JsonResponse
    {
        try {
            $case = MissingPerson::with([
                'assignedOfficer',
                'creator',
                'faceEmbeddings',
                'detections' => function ($query) {
                    $query->orderBy('detected_at', 'desc');
                },
                'detections.camera',
                'sightings' => function ($query) {
                    $query->orderBy('created_at', 'desc');
                },
                'evidence' => function ($query) {
                    $query->orderBy('created_at', 'desc');
                },
                'timeline' => function ($query) {
                    $query->orderBy('created_at', 'desc');
                },
                'timeline.user',
                'alerts' => function ($query) {
                    $query->orderBy('created_at', 'desc');
                },
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $case,
                'message' => 'Case retrieved successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Case not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve case.', ['case_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve case.',
            ], 500);
        }
    }

    /**
     * Update case fields.
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $case = MissingPerson::findOrFail($id);

            $validated = $request->validate([
                'first_name' => 'sometimes|string|max:255',
                'last_name' => 'sometimes|string|max:255',
                'alias' => 'sometimes|nullable|string|max:255',
                'date_of_birth' => 'sometimes|nullable|date|before:today',
                'age' => 'sometimes|integer|min:0|max:150',
                'gender' => 'sometimes|string|in:male,female,other',
                'ethnicity' => 'sometimes|nullable|string|max:100',
                'height_cm' => 'sometimes|nullable|numeric|min:30|max:300',
                'weight_kg' => 'sometimes|nullable|numeric|min:2|max:500',
                'eye_color' => 'sometimes|nullable|string|max:50',
                'hair_color' => 'sometimes|nullable|string|max:50',
                'distinguishing_marks' => 'sometimes|nullable|string|max:1000',
                'last_seen_at' => 'sometimes|date|before_or_equal:now',
                'last_seen_latitude' => 'sometimes|numeric|between:-90,90',
                'last_seen_longitude' => 'sometimes|numeric|between:-180,180',
                'last_seen_location' => 'sometimes|string|max:500',
                'last_seen_clothing' => 'sometimes|nullable|string|max:1000',
                'description' => 'sometimes|string|max:5000',
                'medical_conditions' => 'sometimes|nullable|string|max:2000',
                'priority' => 'sometimes|string|in:low,medium,high,critical',
                'assigned_officer_id' => 'sometimes|nullable|exists:users,id',
            ]);

            DB::beginTransaction();

            $changes = [];
            foreach ($validated as $field => $value) {
                if ($case->$field !== $value) {
                    $changes[$field] = ['old' => $case->$field, 'new' => $value];
                }
            }

            $case->update($validated);

            // Create timeline entry for update
            if (!empty($changes)) {
                TimelineEntry::create([
                    'missing_person_id' => $case->id,
                    'user_id' => $request->user()->id,
                    'type' => 'case_updated',
                    'description' => 'Case details updated.',
                    'metadata' => json_encode($changes),
                ]);
            }

            DB::commit();

            Log::info('Case updated.', ['case_id' => $case->id, 'updated_by' => $request->user()->id]);

            return response()->json([
                'success' => true,
                'data' => $case->fresh()->load(['assignedOfficer', 'creator']),
                'message' => 'Case updated successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Case not found.',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update case.', ['case_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to update case.',
            ], 500);
        }
    }

    /**
     * Soft delete a case.
     */
    public function destroy($id): JsonResponse
    {
        try {
            $case = MissingPerson::findOrFail($id);

            DB::beginTransaction();

            $case->delete();

            TimelineEntry::create([
                'missing_person_id' => $case->id,
                'user_id' => request()->user()->id,
                'type' => 'case_deleted',
                'description' => "Case {$case->case_number} has been deleted.",
                'metadata' => null,
            ]);

            DB::commit();

            Log::info('Case soft-deleted.', ['case_id' => $id, 'deleted_by' => request()->user()->id]);

            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'Case deleted successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Case not found.',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to delete case.', ['case_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete case.',
            ], 500);
        }
    }

    /**
     * Update case status. Creates timeline entry and sends notifications.
     */
    public function updateStatus(Request $request, $id): JsonResponse
    {
        try {
            $case = MissingPerson::findOrFail($id);

            $validated = $request->validate([
                'status' => 'required|string|in:active,found,deceased,closed,pending',
                'notes' => 'sometimes|nullable|string|max:2000',
            ]);

            DB::beginTransaction();

            $oldStatus = $case->status;
            $case->update(['status' => $validated['status']]);

            TimelineEntry::create([
                'missing_person_id' => $case->id,
                'user_id' => $request->user()->id,
                'type' => 'status_changed',
                'description' => "Status changed from {$oldStatus} to {$validated['status']}.",
                'metadata' => json_encode([
                    'old_status' => $oldStatus,
                    'new_status' => $validated['status'],
                    'notes' => $validated['notes'] ?? null,
                ]),
            ]);

            // Dispatch notification job
            \App\Jobs\SendCaseNotification::dispatch($case->id, 'status_changed', [
                'old_status' => $oldStatus,
                'new_status' => $validated['status'],
            ]);

            DB::commit();

            Log::info('Case status updated.', [
                'case_id' => $id,
                'old_status' => $oldStatus,
                'new_status' => $validated['status'],
                'updated_by' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'data' => $case->fresh(),
                'message' => "Case status updated to {$validated['status']}.",
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Case not found.',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update case status.', ['case_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to update case status.',
            ], 500);
        }
    }

    /**
     * Assign an officer to a case.
     */
    public function assignOfficer(Request $request, $id): JsonResponse
    {
        try {
            $case = MissingPerson::findOrFail($id);

            $validated = $request->validate([
                'officer_id' => 'required|exists:users,id',
            ]);

            $officer = \App\Models\User::where('id', $validated['officer_id'])
                ->whereIn('role', ['officer', 'admin'])
                ->firstOrFail();

            DB::beginTransaction();

            $oldOfficerId = $case->assigned_officer_id;
            $case->update(['assigned_officer_id' => $validated['officer_id']]);

            $officerName = $officer->name;
            TimelineEntry::create([
                'missing_person_id' => $case->id,
                'user_id' => $request->user()->id,
                'type' => 'officer_assigned',
                'description' => "Officer {$officerName} assigned to case {$case->case_number}.",
                'metadata' => json_encode([
                    'officer_id' => $validated['officer_id'],
                    'officer_name' => $officerName,
                    'previous_officer_id' => $oldOfficerId,
                ]),
            ]);

            DB::commit();

            Log::info('Officer assigned to case.', [
                'case_id' => $id,
                'officer_id' => $validated['officer_id'],
                'assigned_by' => $request->user()->id,
            ]);

            $case->load('assignedOfficer');

            return response()->json([
                'success' => true,
                'data' => $case,
                'message' => "Officer {$officerName} assigned successfully.",
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Case or officer not found, or officer does not have the required role.',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to assign officer.', ['case_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to assign officer.',
            ], 500);
        }
    }

    /**
     * Return aggregate case statistics.
     */
    public function getStatistics(): JsonResponse
    {
        try {
            $stats = [
                'total_active' => MissingPerson::where('status', 'active')->count(),
                'by_status' => MissingPerson::selectRaw('status, COUNT(*) as count')
                    ->groupBy('status')
                    ->pluck('count', 'status'),
                'by_priority' => MissingPerson::selectRaw('priority, COUNT(*) as count')
                    ->where('status', 'active')
                    ->groupBy('priority')
                    ->pluck('count', 'priority'),
                'recent_detections' => \App\Models\Detection::whereHas('missingPerson', function ($q) {
                        $q->where('status', 'active');
                    })
                    ->where('detected_at', '>=', now()->subDays(7))
                    ->count(),
                'total_cases' => MissingPerson::count(),
                'found_this_month' => MissingPerson::where('status', 'found')
                    ->whereMonth('updated_at', now()->month)
                    ->whereYear('updated_at', now()->year)
                    ->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'message' => 'Statistics retrieved successfully.',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve statistics.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve statistics.',
            ], 500);
        }
    }

    /**
     * Full-text search across name, case_number, description.
     */
    public function search(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'q' => 'required|string|min:2|max:255',
                'per_page' => 'sometimes|integer|min:1|max:100',
            ]);

            $searchTerm = $validated['q'];

            $cases = MissingPerson::with(['assignedOfficer', 'creator'])
                ->where(function ($query) use ($searchTerm) {
                    $query->where('first_name', 'LIKE', "%{$searchTerm}%")
                        ->orWhere('last_name', 'LIKE', "%{$searchTerm}%")
                        ->orWhere('case_number', 'LIKE', "%{$searchTerm}%")
                        ->orWhere('description', 'LIKE', "%{$searchTerm}%")
                        ->orWhere('alias', 'LIKE', "%{$searchTerm}%")
                        ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$searchTerm}%"]);
                })
                ->orderBy('created_at', 'desc')
                ->paginate($validated['per_page'] ?? 15);

            return response()->json([
                'success' => true,
                'data' => $cases->items(),
                'message' => "Search results for \"{$searchTerm}\".",
                'meta' => [
                    'current_page' => $cases->currentPage(),
                    'last_page' => $cases->lastPage(),
                    'per_page' => $cases->perPage(),
                    'total' => $cases->total(),
                    'query' => $searchTerm,
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Search failed.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Search failed.',
            ], 500);
        }
    }
}
