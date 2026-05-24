<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Camera;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class CameraController extends Controller
{
    /**
     * List cameras with filters and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'status' => 'sometimes|string|in:active,inactive,maintenance',
                'type' => 'sometimes|string|in:fixed,ptz,body_cam,dash_cam',
                'jurisdiction_id' => 'sometimes|exists:jurisdictions,id',
                'search' => 'sometimes|string|max:255',
                'sort_by' => 'sometimes|string|in:name,created_at,last_health_check',
                'sort_order' => 'sometimes|string|in:asc,desc',
                'per_page' => 'sometimes|integer|min:1|max:100',
            ]);

            $query = Camera::with('jurisdiction');

            if (!empty($validated['status'])) {
                $query->where('status', $validated['status']);
            }

            if (!empty($validated['type'])) {
                $query->where('type', $validated['type']);
            }

            if (!empty($validated['jurisdiction_id'])) {
                $query->where('jurisdiction_id', $validated['jurisdiction_id']);
            }

            if (!empty($validated['search'])) {
                $search = $validated['search'];
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                        ->orWhere('location_name', 'LIKE', "%{$search}%");
                });
            }

            $sortBy = $validated['sort_by'] ?? 'created_at';
            $sortOrder = $validated['sort_order'] ?? 'desc';
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $validated['per_page'] ?? 15;
            $cameras = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $cameras->items(),
                'message' => 'Cameras retrieved successfully.',
                'meta' => [
                    'current_page' => $cameras->currentPage(),
                    'last_page' => $cameras->lastPage(),
                    'per_page' => $cameras->perPage(),
                    'total' => $cameras->total(),
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to list cameras.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve cameras.',
            ], 500);
        }
    }

    /**
     * Add a new camera with RTSP URL validation.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'type' => 'required|string|in:fixed,ptz,body_cam,dash_cam',
                'rtsp_url' => 'required|string|max:1000',
                'location_name' => 'required|string|max:500',
                'latitude' => 'sometimes|nullable|numeric|between:-90,90',
                'longitude' => 'sometimes|nullable|numeric|between:-180,180',
                'jurisdiction_id' => 'sometimes|nullable|exists:jurisdictions,id',
                'description' => 'sometimes|nullable|string|max:2000',
                'is_public' => 'sometimes|boolean',
            ]);

            // Validate RTSP URL format
            $rtspUrl = $validated['rtsp_url'];
            if (!preg_match('/^rtsp:\/\/.+/i', $rtspUrl) && !preg_match('/^http[s]?:\/\/.+/i', $rtspUrl)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid stream URL format. Must be an RTSP or HTTP(S) URL.',
                    'errors' => ['rtsp_url' => ['The URL must be a valid RTSP or HTTP stream URL.']],
                ], 422);
            }

            // Test connection (optional, non-blocking)
            $connectionStatus = 'unknown';
            try {
                $response = Http::timeout(5)->get($rtspUrl);
                $connectionStatus = $response->successful() ? 'connected' : 'unreachable';
            } catch (\Exception $e) {
                $connectionStatus = 'unreachable';
                Log::warning('Camera connection test failed.', ['url' => $rtspUrl, 'error' => $e->getMessage()]);
            }

            $camera = Camera::create([
                'name' => $validated['name'],
                'type' => $validated['type'],
                'rtsp_url' => $validated['rtsp_url'],
                'location_name' => $validated['location_name'],
                'latitude' => $validated['latitude'] ?? null,
                'longitude' => $validated['longitude'] ?? null,
                'jurisdiction_id' => $validated['jurisdiction_id'] ?? null,
                'description' => $validated['description'] ?? null,
                'is_public' => $validated['is_public'] ?? false,
                'status' => 'active',
                'connection_status' => $connectionStatus,
                'last_health_check' => now(),
                'created_by' => $request->user()->id,
            ]);

            Log::info('Camera added.', ['camera_id' => $camera->id, 'name' => $camera->name]);

            return response()->json([
                'success' => true,
                'data' => $camera,
                'message' => 'Camera added successfully.',
                'meta' => [
                    'connection_status' => $connectionStatus,
                ],
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to add camera.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to add camera.',
            ], 500);
        }
    }

    /**
     * Get camera with recent detections.
     */
    public function show($id): JsonResponse
    {
        try {
            $camera = Camera::with([
                'jurisdiction',
                'detections' => function ($query) {
                    $query->orderBy('detected_at', 'desc')->limit(50);
                },
                'detections.missingPerson',
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $camera,
                'message' => 'Camera retrieved successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Camera not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve camera.', ['camera_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve camera.',
            ], 500);
        }
    }

    /**
     * Update camera details.
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $camera = Camera::findOrFail($id);

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'type' => 'sometimes|string|in:fixed,ptz,body_cam,dash_cam',
                'rtsp_url' => 'sometimes|string|max:1000',
                'location_name' => 'sometimes|string|max:500',
                'latitude' => 'sometimes|nullable|numeric|between:-90,90',
                'longitude' => 'sometimes|nullable|numeric|between:-180,180',
                'jurisdiction_id' => 'sometimes|nullable|exists:jurisdictions,id',
                'description' => 'sometimes|nullable|string|max:2000',
                'status' => 'sometimes|string|in:active,inactive,maintenance',
                'is_public' => 'sometimes|boolean',
            ]);

            // Validate RTSP URL format if being updated
            if (!empty($validated['rtsp_url'])) {
                if (!preg_match('/^rtsp:\/\/.+/i', $validated['rtsp_url']) && !preg_match('/^http[s]?:\/\/.+/i', $validated['rtsp_url'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid stream URL format.',
                        'errors' => ['rtsp_url' => ['The URL must be a valid RTSP or HTTP stream URL.']],
                    ], 422);
                }
            }

            $camera->update($validated);

            Log::info('Camera updated.', ['camera_id' => $id, 'updated_by' => $request->user()->id]);

            return response()->json([
                'success' => true,
                'data' => $camera->fresh()->load('jurisdiction'),
                'message' => 'Camera updated successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Camera not found.',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to update camera.', ['camera_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to update camera.',
            ], 500);
        }
    }

    /**
     * Soft delete camera.
     */
    public function destroy($id): JsonResponse
    {
        try {
            $camera = Camera::findOrFail($id);

            // Check if camera has active detections
            $activeDetections = $camera->detections()
                ->where('verified', false)
                ->whereNull('verified_at')
                ->count();

            if ($activeDetections > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete camera. It has {$activeDetections} unverified detections. Deactivate it instead.",
                ], 422);
            }

            $camera->delete();

            Log::info('Camera soft-deleted.', ['camera_id' => $id, 'deleted_by' => request()->user()->id]);

            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'Camera deleted successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Camera not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to delete camera.', ['camera_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete camera.',
            ], 500);
        }
    }

    /**
     * Check if camera stream is accessible. Update last_health_check.
     */
    public function healthCheck($id): JsonResponse
    {
        try {
            $camera = Camera::findOrFail($id);

            $startTime = microtime(true);
            $isAccessible = false;
            $statusCode = null;
            $errorMessage = null;

            try {
                $response = Http::timeout(10)->get($camera->rtsp_url);
                $isAccessible = $response->successful();
                $statusCode = $response->status();
            } catch (\Exception $e) {
                $errorMessage = $e->getMessage();
                Log::warning('Camera health check failed.', ['camera_id' => $id, 'error' => $errorMessage]);
            }

            $responseTime = round((microtime(true) - $startTime) * 1000, 2); // ms

            $camera->update([
                'last_health_check' => now(),
                'connection_status' => $isAccessible ? 'connected' : 'unreachable',
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'camera_id' => $id,
                    'is_accessible' => $isAccessible,
                    'status_code' => $statusCode,
                    'response_time_ms' => $responseTime,
                    'connection_status' => $camera->connection_status,
                    'last_health_check' => $camera->fresh()->last_health_check,
                    'error' => $errorMessage,
                ],
                'message' => $isAccessible ? 'Camera is accessible.' : 'Camera is not accessible.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Camera not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Health check failed.', ['camera_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Health check failed.',
            ], 500);
        }
    }

    /**
     * Send request to AI service to start processing stream.
     */
    public function startMonitoring(Request $request, $id): JsonResponse
    {
        try {
            $camera = Camera::findOrFail($id);

            if ($camera->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'Camera must be active to start monitoring.',
                ], 422);
            }

            // Dispatch job to start AI stream processing
            \App\Jobs\StartCameraMonitoring::dispatch($camera->id);

            $camera->update([
                'is_monitoring' => true,
                'monitoring_started_at' => now(),
            ]);

            Log::info('Camera monitoring started.', ['camera_id' => $id, 'started_by' => $request->user()->id]);

            return response()->json([
                'success' => true,
                'data' => $camera->fresh(),
                'message' => 'Camera monitoring started.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Camera not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to start monitoring.', ['camera_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to start monitoring.',
            ], 500);
        }
    }

    /**
     * Stop AI service stream processing.
     */
    public function stopMonitoring(Request $request, $id): JsonResponse
    {
        try {
            $camera = Camera::findOrFail($id);

            if (!$camera->is_monitoring) {
                return response()->json([
                    'success' => false,
                    'message' => 'Camera is not currently being monitored.',
                ], 422);
            }

            // Dispatch job to stop AI stream processing
            \App\Jobs\StopCameraMonitoring::dispatch($camera->id);

            $camera->update([
                'is_monitoring' => false,
                'monitoring_stopped_at' => now(),
            ]);

            Log::info('Camera monitoring stopped.', ['camera_id' => $id, 'stopped_by' => $request->user()->id]);

            return response()->json([
                'success' => true,
                'data' => $camera->fresh(),
                'message' => 'Camera monitoring stopped.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Camera not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to stop monitoring.', ['camera_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to stop monitoring.',
            ], 500);
        }
    }
}
