<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sighting;
use App\Models\Detection;
use App\Models\MissingPerson;
use App\Models\TimelineEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SightingController extends Controller
{
    /**
     * List sightings with filters and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'person_id' => 'sometimes|exists:missing_persons,id',
                'status' => 'sometimes|string|in:pending,verified,rejected',
                'date_from' => 'sometimes|date',
                'date_to' => 'sometimes|date|after_or_equal:date_from',
                'sort_by' => 'sometimes|string|in:created_at,verified_at',
                'sort_order' => 'sometimes|string|in:asc,desc',
                'per_page' => 'sometimes|integer|min:1|max:100',
            ]);

            $query = Sighting::with(['missingPerson', 'verifier']);

            if (!empty($validated['person_id'])) {
                $query->where('missing_person_id', $validated['person_id']);
            }

            if (!empty($validated['status'])) {
                $query->where('status', $validated['status']);
            }

            if (!empty($validated['date_from'])) {
                $query->where('created_at', '>=', $validated['date_from']);
            }

            if (!empty($validated['date_to'])) {
                $query->where('created_at', '<=', $validated['date_to'] . ' 23:59:59');
            }

            $sortBy = $validated['sort_by'] ?? 'created_at';
            $sortOrder = $validated['sort_order'] ?? 'desc';
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $validated['per_page'] ?? 15;
            $sightings = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $sightings->items(),
                'message' => 'Sightings retrieved successfully.',
                'meta' => [
                    'current_page' => $sightings->currentPage(),
                    'last_page' => $sightings->lastPage(),
                    'per_page' => $sightings->perPage(),
                    'total' => $sightings->total(),
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to list sightings.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve sightings.',
            ], 500);
        }
    }

    /**
     * Submit a public sighting. Accept image/video, dispatch AI comparison job.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'missing_person_id' => 'required|exists:missing_persons,id',
                'description' => 'required|string|max:5000',
                'location_name' => 'required|string|max:500',
                'latitude' => 'required|numeric|between:-90,90',
                'longitude' => 'required|numeric|between:-180,180',
                'sighted_at' => 'required|date|before_or_equal:now',
                'image' => 'sometimes|nullable|image|mimes:jpeg,png,jpg|max:10240',
                'video' => 'sometimes|nullable|mimes:mp4,avi,mov,wmv|max:51200',
                'contact_name' => 'sometimes|nullable|string|max:255',
                'contact_phone' => 'sometimes|nullable|string|max:20',
                'contact_email' => 'sometimes|nullable|email|max:255',
            ]);

            DB::beginTransaction();

            $imagePath = null;
            $videoPath = null;

            if ($request->hasFile('image')) {
                $imagePath = $request->file('image')->store('sightings/images', 'public');
            }

            if ($request->hasFile('video')) {
                $videoPath = $request->file('video')->store('sightings/videos', 'public');
            }

            // Capture device info
            $deviceInfo = [
                'user_agent' => $request->userAgent(),
                'ip_address' => $request->ip(),
                'platform' => $request->header('X-Platform', 'unknown'),
            ];

            $sighting = Sighting::create([
                'missing_person_id' => $validated['missing_person_id'],
                'description' => $validated['description'],
                'location_name' => $validated['location_name'],
                'latitude' => $validated['latitude'],
                'longitude' => $validated['longitude'],
                'sighted_at' => $validated['sighted_at'],
                'image_path' => $imagePath,
                'video_path' => $videoPath,
                'contact_name' => $validated['contact_name'] ?? null,
                'contact_phone' => $validated['contact_phone'] ?? null,
                'contact_email' => $validated['contact_email'] ?? null,
                'device_info' => $deviceInfo,
                'status' => 'pending',
                'reported_by' => $request->user()->id,
            ]);

            // Create timeline entry
            $case = MissingPerson::find($validated['missing_person_id']);
            TimelineEntry::create([
                'missing_person_id' => $validated['missing_person_id'],
                'user_id' => $request->user()->id,
                'type' => 'sighting_reported',
                'description' => "New sighting reported for case {$case->case_number} at {$validated['location_name']}.",
                'metadata' => json_encode([
                    'sighting_id' => $sighting->id,
                    'location' => $validated['location_name'],
                    'sighted_at' => $validated['sighted_at'],
                ]),
            ]);

            // Dispatch AI comparison job if image is provided
            if ($imagePath) {
                \App\Jobs\CompareSightingImage::dispatch($sighting->id);
            }

            DB::commit();

            Log::info('Sighting submitted.', [
                'sighting_id' => $sighting->id,
                'person_id' => $validated['missing_person_id'],
                'reported_by' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'data' => $sighting,
                'message' => 'Sighting submitted successfully. It will be reviewed by an officer.',
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
            Log::error('Failed to submit sighting.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit sighting.',
            ], 500);
        }
    }

    /**
     * Get sighting with relationships.
     */
    public function show($id): JsonResponse
    {
        try {
            $sighting = Sighting::with(['missingPerson', 'verifier', 'reporter'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $sighting,
                'message' => 'Sighting retrieved successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sighting not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve sighting.', ['sighting_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve sighting.',
            ], 500);
        }
    }

    /**
     * Officer verifies/rejects sighting. If verified, create detection record.
     */
    public function verify(Request $request, $id): JsonResponse
    {
        try {
            $sighting = Sighting::findOrFail($id);

            $validated = $request->validate([
                'status' => 'required|string|in:verified,rejected',
                'notes' => 'sometimes|nullable|string|max:2000',
            ]);

            DB::beginTransaction();

            $sighting->update([
                'status' => $validated['status'],
                'verified_at' => now(),
                'verified_by' => $request->user()->id,
                'verification_notes' => $validated['notes'] ?? null,
            ]);

            // If verified, create a detection record
            if ($validated['status'] === 'verified') {
                $detection = Detection::create([
                    'missing_person_id' => $sighting->missing_person_id,
                    'source' => 'upload',
                    'confidence' => 0.75, // Manual verification default confidence
                    'latitude' => $sighting->latitude,
                    'longitude' => $sighting->longitude,
                    'location_name' => $sighting->location_name,
                    'image_path' => $sighting->image_path,
                    'detected_at' => $sighting->sighted_at,
                    'verified' => true,
                    'verified_at' => now(),
                    'verified_by' => $request->user()->id,
                    'metadata' => json_encode(['sighting_id' => $sighting->id]),
                ]);

                // Update case status if applicable
                $case = MissingPerson::find($sighting->missing_person_id);
                if ($case && $case->status === 'active') {
                    $case->update(['last_seen_at' => $sighting->sighted_at]);
                }
            }

            // Create timeline entry
            TimelineEntry::create([
                'missing_person_id' => $sighting->missing_person_id,
                'user_id' => $request->user()->id,
                'type' => 'sighting_' . $validated['status'],
                'description' => "Sighting #{$sighting->id} has been {$validated['status']} by officer.",
                'metadata' => json_encode([
                    'sighting_id' => $sighting->id,
                    'status' => $validated['status'],
                    'notes' => $validated['notes'] ?? null,
                ]),
            ]);

            DB::commit();

            Log::info('Sighting verified/rejected.', [
                'sighting_id' => $id,
                'status' => $validated['status'],
                'verified_by' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'data' => $sighting->fresh()->load(['missingPerson', 'verifier']),
                'message' => "Sighting {$validated['status']} successfully.",
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sighting not found.',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to verify sighting.', ['sighting_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to verify sighting.',
            ], 500);
        }
    }

    /**
     * Get unverified sightings for officer review.
     */
    public function getPendingSightings(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'person_id' => 'sometimes|exists:missing_persons,id',
                'per_page' => 'sometimes|integer|min:1|max:100',
            ]);

            $query = Sighting::with(['missingPerson', 'reporter'])
                ->where('status', 'pending')
                ->orderBy('created_at', 'asc');

            if (!empty($validated['person_id'])) {
                $query->where('missing_person_id', $validated['person_id']);
            }

            $perPage = $validated['per_page'] ?? 15;
            $sightings = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $sightings->items(),
                'message' => 'Pending sightings retrieved successfully.',
                'meta' => [
                    'current_page' => $sightings->currentPage(),
                    'last_page' => $sightings->lastPage(),
                    'per_page' => $sightings->perPage(),
                    'total' => $sightings->total(),
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve pending sightings.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve pending sightings.',
            ], 500);
        }
    }
}
