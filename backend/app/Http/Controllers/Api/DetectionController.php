<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Detection;
use App\Models\MissingPerson;
use App\Models\TimelineEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DetectionController extends Controller
{
    /**
     * List detections with filters and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'person_id' => 'sometimes|exists:missing_persons,id',
                'camera_id' => 'sometimes|exists:cameras,id',
                'source' => 'sometimes|string|in:camera,upload,api',
                'confidence_min' => 'sometimes|numeric|between:0,1',
                'confidence_max' => 'sometimes|numeric|between:0,1',
                'date_from' => 'sometimes|date',
                'date_to' => 'sometimes|date|after_or_equal:date_from',
                'verified' => 'sometimes|boolean',
                'sort_by' => 'sometimes|string|in:detected_at,confidence,created_at',
                'sort_order' => 'sometimes|string|in:asc,desc',
                'per_page' => 'sometimes|integer|min:1|max:100',
            ]);

            $query = Detection::with(['missingPerson', 'camera', 'verifier']);

            if (!empty($validated['person_id'])) {
                $query->where('missing_person_id', $validated['person_id']);
            }

            if (!empty($validated['camera_id'])) {
                $query->where('camera_id', $validated['camera_id']);
            }

            if (!empty($validated['source'])) {
                $query->where('source', $validated['source']);
            }

            if (isset($validated['confidence_min'])) {
                $query->where('confidence', '>=', $validated['confidence_min']);
            }

            if (isset($validated['confidence_max'])) {
                $query->where('confidence', '<=', $validated['confidence_max']);
            }

            if (!empty($validated['date_from'])) {
                $query->where('detected_at', '>=', $validated['date_from']);
            }

            if (!empty($validated['date_to'])) {
                $query->where('detected_at', '<=', $validated['date_to'] . ' 23:59:59');
            }

            if (isset($validated['verified'])) {
                if ($validated['verified']) {
                    $query->whereNotNull('verified_at');
                } else {
                    $query->whereNull('verified_at');
                }
            }

            $sortBy = $validated['sort_by'] ?? 'detected_at';
            $sortOrder = $validated['sort_order'] ?? 'desc';
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $validated['per_page'] ?? 15;
            $detections = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $detections->items(),
                'message' => 'Detections retrieved successfully.',
                'meta' => [
                    'current_page' => $detections->currentPage(),
                    'last_page' => $detections->lastPage(),
                    'per_page' => $detections->perPage(),
                    'total' => $detections->total(),
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to list detections.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve detections.',
            ], 500);
        }
    }

    /**
     * Save a new detection. Dispatch alert job if high confidence.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'missing_person_id' => 'required|exists:missing_persons,id',
                'camera_id' => 'sometimes|nullable|exists:cameras,id',
                'source' => 'required|string|in:camera,upload,api',
                'confidence' => 'required|numeric|between:0,1',
                'latitude' => 'sometimes|nullable|numeric|between:-90,90',
                'longitude' => 'sometimes|nullable|numeric|between:-180,180',
                'location_name' => 'sometimes|nullable|string|max:500',
                'image_path' => 'sometimes|nullable|string|max:1000',
                'bounding_box' => 'sometimes|nullable|array',
                'bounding_box.x' => 'sometimes|numeric',
                'bounding_box.y' => 'sometimes|numeric',
                'bounding_box.width' => 'sometimes|numeric',
                'bounding_box.height' => 'sometimes|numeric',
                'metadata' => 'sometimes|nullable|array',
                'detected_at' => 'sometimes|date|before_or_equal:now',
            ]);

            DB::beginTransaction();

            $detection = Detection::create([
                'missing_person_id' => $validated['missing_person_id'],
                'camera_id' => $validated['camera_id'] ?? null,
                'source' => $validated['source'],
                'confidence' => $validated['confidence'],
                'latitude' => $validated['latitude'] ?? null,
                'longitude' => $validated['longitude'] ?? null,
                'location_name' => $validated['location_name'] ?? null,
                'image_path' => $validated['image_path'] ?? null,
                'bounding_box' => $validated['bounding_box'] ?? null,
                'metadata' => $validated['metadata'] ?? null,
                'detected_at' => $validated['detected_at'] ?? now(),
                'verified' => false,
            ]);

            // Create timeline entry
            $case = MissingPerson::find($validated['missing_person_id']);
            TimelineEntry::create([
                'missing_person_id' => $validated['missing_person_id'],
                'user_id' => $request->user()->id,
                'type' => 'detection',
                'description' => "New detection recorded for case {$case->case_number} with confidence " . round($validated['confidence'] * 100) . "%.",
                'metadata' => json_encode([
                    'detection_id' => $detection->id,
                    'confidence' => $validated['confidence'],
                    'source' => $validated['source'],
                    'location' => $validated['location_name'] ?? null,
                ]),
            ]);

            // Dispatch alert job if high confidence (>0.85)
            if ($validated['confidence'] > 0.85) {
                \App\Jobs\SendDetectionAlert::dispatch($detection->id);
            }

            DB::commit();

            Log::info('Detection created.', [
                'detection_id' => $detection->id,
                'person_id' => $validated['missing_person_id'],
                'confidence' => $validated['confidence'],
            ]);

            $detection->load(['missingPerson', 'camera']);

            return response()->json([
                'success' => true,
                'data' => $detection,
                'message' => 'Detection recorded successfully.',
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
            Log::error('Failed to create detection.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to record detection.',
            ], 500);
        }
    }

    /**
     * Get detection with relationships.
     */
    public function show($id): JsonResponse
    {
        try {
            $detection = Detection::with(['missingPerson', 'camera', 'verifier'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $detection,
                'message' => 'Detection retrieved successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Detection not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve detection.', ['detection_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve detection.',
            ], 500);
        }
    }

    /**
     * Mark detection as verified/rejected by officer.
     */
    public function verify(Request $request, $id): JsonResponse
    {
        try {
            $detection = Detection::findOrFail($id);

            $validated = $request->validate([
                'is_verified' => 'required|boolean',
                'notes' => 'sometimes|nullable|string|max:2000',
            ]);

            DB::beginTransaction();

            $detection->update([
                'verified' => $validated['is_verified'],
                'verified_at' => now(),
                'verified_by' => $request->user()->id,
                'verification_notes' => $validated['notes'] ?? null,
            ]);

            $status = $validated['is_verified'] ? 'verified' : 'rejected';
            TimelineEntry::create([
                'missing_person_id' => $detection->missing_person_id,
                'user_id' => $request->user()->id,
                'type' => 'detection_verified',
                'description' => "Detection #{$detection->id} has been {$status} by officer.",
                'metadata' => json_encode([
                    'detection_id' => $detection->id,
                    'is_verified' => $validated['is_verified'],
                    'notes' => $validated['notes'] ?? null,
                ]),
            ]);

            DB::commit();

            Log::info('Detection verified/rejected.', [
                'detection_id' => $id,
                'is_verified' => $validated['is_verified'],
                'verified_by' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'data' => $detection->fresh()->load(['missingPerson', 'camera', 'verifier']),
                'message' => "Detection {$status} successfully.",
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Detection not found.',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to verify detection.', ['detection_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to verify detection.',
            ], 500);
        }
    }

    /**
     * Get last N detections for dashboard live feed.
     */
    public function getRecentDetections(Request $request): JsonResponse
    {
        try {
            $limit = $request->input('limit', 20);

            $request->validate([
                'limit' => 'sometimes|integer|min:1|max:100',
            ]);

            $detections = Detection::with(['missingPerson', 'camera'])
                ->orderBy('detected_at', 'desc')
                ->limit($limit)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $detections,
                'message' => 'Recent detections retrieved successfully.',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve recent detections.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve recent detections.',
            ], 500);
        }
    }

    /**
     * Return detection statistics.
     */
    public function getDetectionStats(): JsonResponse
    {
        try {
            $stats = [
                'total' => Detection::count(),
                'verified' => Detection::where('verified', true)->count(),
                'rejected' => Detection::where('verified', false)->whereNotNull('verified_at')->count(),
                'pending_verification' => Detection::whereNull('verified_at')->count(),
                'by_source' => Detection::selectRaw('source, COUNT(*) as count')
                    ->groupBy('source')
                    ->pluck('count', 'source'),
                'by_confidence_range' => [
                    'low_0_50' => Detection::where('confidence', '<', 0.50)->count(),
                    'medium_50_70' => Detection::whereBetween('confidence', [0.50, 0.70])->count(),
                    'high_70_85' => Detection::whereBetween('confidence', [0.70, 0.85])->count(),
                    'very_high_85_plus' => Detection::where('confidence', '>', 0.85)->count(),
                ],
                'trend_data' => Detection::selectRaw('DATE(detected_at) as date, COUNT(*) as count')
                    ->where('detected_at', '>=', now()->subDays(30))
                    ->groupBy('date')
                    ->orderBy('date')
                    ->get(),
                'today_count' => Detection::whereDate('detected_at', today())->count(),
                'this_week_count' => Detection::where('detected_at', '>=', now()->startOfWeek())->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'message' => 'Detection statistics retrieved successfully.',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve detection stats.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve detection statistics.',
            ], 500);
        }
    }
}
