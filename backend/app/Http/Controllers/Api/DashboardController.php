<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Camera;
use App\Models\Detection;
use App\Models\MissingPerson;
use App\Models\Sighting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    /**
     * Get aggregated dashboard statistics.
     */
    public function getStats(Request $request): JsonResponse
    {
        try {
            $stats = Cache::remember('dashboard_stats', 60, function () {
                return [
                    'cases' => [
                        'total' => MissingPerson::count(),
                        'active' => MissingPerson::where('status', 'missing')->count(),
                        'under_investigation' => MissingPerson::where('status', 'under_investigation')->count(),
                        'detected' => MissingPerson::where('status', 'detected')->count(),
                        'found_safe' => MissingPerson::where('status', 'found_safe')->count(),
                        'closed' => MissingPerson::where('status', 'closed')->count(),
                        'critical_priority' => MissingPerson::where('priority_level', 'critical')
                            ->where('status', '!=', 'closed')->count(),
                    ],
                    'detections' => [
                        'total' => Detection::count(),
                        'today' => Detection::whereDate('created_at', today())->count(),
                        'this_week' => Detection::where('created_at', '>=', now()->startOfWeek())->count(),
                        'unverified' => Detection::where('is_verified', false)->count(),
                        'high_confidence' => Detection::where('confidence_score', '>=', 0.85)->count(),
                    ],
                    'sightings' => [
                        'total' => Sighting::count(),
                        'pending' => Sighting::where('status', 'pending')->count(),
                        'verified' => Sighting::where('status', 'verified')->count(),
                        'today' => Sighting::whereDate('created_at', today())->count(),
                    ],
                    'cameras' => [
                        'total' => Camera::count(),
                        'active' => Camera::where('status', 'active')->count(),
                        'inactive' => Camera::where('status', 'inactive')->count(),
                        'maintenance' => Camera::where('status', 'maintenance')->count(),
                    ],
                    'users' => [
                        'total' => User::count(),
                        'officers' => User::where('role', 'officer')->count(),
                        'active_today' => User::whereDate('updated_at', today())->count(),
                    ],
                    'alerts' => [
                        'total' => Alert::count(),
                        'unread' => Alert::where('is_read', false)->count(),
                        'today' => Alert::whereDate('created_at', today())->count(),
                    ],
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $stats,
                'message' => 'Dashboard statistics retrieved successfully.',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve dashboard stats.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve dashboard statistics.',
            ], 500);
        }
    }

    /**
     * Get recent activity feed for the dashboard.
     */
    public function getRecentActivity(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'limit' => 'sometimes|integer|min:1|max:50',
            ]);

            $limit = $validated['limit'] ?? 20;

            $recentDetections = Detection::with(['missingPerson', 'camera'])
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get()
                ->map(fn ($d) => [
                    'type' => 'detection',
                    'id' => $d->id,
                    'description' => "Detection for {$d->missingPerson->full_name} ({$d->confidence_score}% confidence)",
                    'location' => $d->location_name,
                    'timestamp' => $d->created_at,
                    'data' => $d,
                ]);

            $recentSightings = Sighting::with(['missingPerson', 'reporter'])
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get()
                ->map(fn ($s) => [
                    'type' => 'sighting',
                    'id' => $s->id,
                    'description' => "Sighting report for {$s->missingPerson->full_name}",
                    'location' => $s->location_name,
                    'timestamp' => $s->created_at,
                    'data' => $s,
                ]);

            $activity = $recentDetections->merge($recentSightings)
                ->sortByDesc('timestamp')
                ->take($limit)
                ->values();

            return response()->json([
                'success' => true,
                'data' => $activity,
                'message' => 'Recent activity retrieved successfully.',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve recent activity.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve recent activity.',
            ], 500);
        }
    }

    /**
     * Get detection trend data for charts (last 30 days).
     */
    public function getDetectionTrends(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'days' => 'sometimes|integer|min:7|max:90',
            ]);

            $days = $validated['days'] ?? 30;

            $trends = Detection::selectRaw('DATE(created_at) as date, COUNT(*) as count')
                ->where('created_at', '>=', now()->subDays($days))
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            $sightingTrends = Sighting::selectRaw('DATE(created_at) as date, COUNT(*) as count')
                ->where('created_at', '>=', now()->subDays($days))
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'detections' => $trends,
                    'sightings' => $sightingTrends,
                    'period_days' => $days,
                ],
                'message' => 'Detection trends retrieved successfully.',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve detection trends.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve detection trends.',
            ], 500);
        }
    }

    /**
     * Get statistics grouped by region/jurisdiction.
     */
    public function getRegionalStats(Request $request): JsonResponse
    {
        try {
            $caseStats = MissingPerson::selectRaw('
                    jurisdiction,
                    COUNT(*) as total_cases,
                    SUM(CASE WHEN status = "missing" THEN 1 ELSE 0 END) as active_cases,
                    SUM(CASE WHEN status = "found_safe" THEN 1 ELSE 0 END) as found_cases
                ')
                ->whereNotNull('jurisdiction')
                ->groupBy('jurisdiction')
                ->orderByDesc('total_cases')
                ->get();

            $detectionStats = Detection::selectRaw('location_name, COUNT(*) as detection_count')
                ->whereNotNull('location_name')
                ->groupBy('location_name')
                ->orderByDesc('detection_count')
                ->limit(20)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'by_jurisdiction' => $caseStats,
                    'by_location' => $detectionStats,
                ],
                'message' => 'Regional statistics retrieved successfully.',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve regional stats.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve regional statistics.',
            ], 500);
        }
    }

    /**
     * Get heatmap data (latitude/longitude points for active cases and detections).
     */
    public function getHeatmapData(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'type' => 'sometimes|string|in:cases,detections,sightings',
                'days' => 'sometimes|integer|min:1|max:365',
            ]);

            $type = $validated['type'] ?? 'cases';
            $days = $validated['days'] ?? 30;

            $points = match ($type) {
                'cases' => MissingPerson::where('status', '!=', 'closed')
                    ->whereNotNull('last_seen_lat')
                    ->whereNotNull('last_seen_lng')
                    ->selectRaw('last_seen_lat as lat, last_seen_lng as lng, status, priority_level')
                    ->get(),

                'detections' => Detection::where('created_at', '>=', now()->subDays($days))
                    ->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->selectRaw('latitude as lat, longitude as lng, confidence_score, source')
                    ->get(),

                'sightings' => Sighting::where('created_at', '>=', now()->subDays($days))
                    ->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->selectRaw('latitude as lat, longitude as lng, status')
                    ->get(),

                default => collect(),
            };

            return response()->json([
                'success' => true,
                'data' => [
                    'type' => $type,
                    'points' => $points,
                    'total' => $points->count(),
                ],
                'message' => 'Heatmap data retrieved successfully.',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve heatmap data.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve heatmap data.',
            ], 500);
        }
    }
}
