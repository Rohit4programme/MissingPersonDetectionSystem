<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AlertController extends Controller
{
    /**
     * List alerts for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'is_read' => 'sometimes|boolean',
                'alert_type' => 'sometimes|string|max:50',
                'channel' => 'sometimes|string|in:dashboard,sms,email,push,whatsapp',
                'person_id' => 'sometimes|exists:missing_persons,id',
                'sort_by' => 'sometimes|string|in:created_at,sent_at',
                'sort_order' => 'sometimes|string|in:asc,desc',
                'per_page' => 'sometimes|integer|min:1|max:100',
            ]);

            $query = Alert::with(['missingPerson', 'detection', 'recipient'])
                ->where('recipient_id', $request->user()->id);

            if (isset($validated['is_read'])) {
                $query->where('is_read', $validated['is_read']);
            }

            if (!empty($validated['alert_type'])) {
                $query->where('alert_type', $validated['alert_type']);
            }

            if (!empty($validated['channel'])) {
                $query->where('channel', $validated['channel']);
            }

            if (!empty($validated['person_id'])) {
                $query->where('person_id', $validated['person_id']);
            }

            $sortBy = $validated['sort_by'] ?? 'created_at';
            $sortOrder = $validated['sort_order'] ?? 'desc';
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $validated['per_page'] ?? 15;
            $alerts = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $alerts->items(),
                'message' => 'Alerts retrieved successfully.',
                'meta' => [
                    'current_page' => $alerts->currentPage(),
                    'last_page' => $alerts->lastPage(),
                    'per_page' => $alerts->perPage(),
                    'total' => $alerts->total(),
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to list alerts.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve alerts.',
            ], 500);
        }
    }

    /**
     * Mark a single alert as read.
     */
    public function markAsRead(Request $request, int $id): JsonResponse
    {
        try {
            $alert = Alert::where('recipient_id', $request->user()->id)->findOrFail($id);

            if (!$alert->is_read) {
                $alert->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $alert->fresh(),
                'message' => 'Alert marked as read.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Alert not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to mark alert as read.', ['alert_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark alert as read.',
            ], 500);
        }
    }

    /**
     * Mark all alerts as read for the authenticated user.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        try {
            $count = Alert::where('recipient_id', $request->user()->id)
                ->where('is_read', false)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);

            return response()->json([
                'success' => true,
                'data' => ['marked_count' => $count],
                'message' => "{$count} alerts marked as read.",
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to mark all alerts as read.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark all alerts as read.',
            ], 500);
        }
    }

    /**
     * Get unread alert count for the authenticated user.
     */
    public function getUnreadCount(Request $request): JsonResponse
    {
        try {
            $count = Alert::where('recipient_id', $request->user()->id)
                ->where('is_read', false)
                ->count();

            return response()->json([
                'success' => true,
                'data' => ['unread_count' => $count],
                'message' => 'Unread count retrieved.',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get unread count.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve unread count.',
            ], 500);
        }
    }
}
