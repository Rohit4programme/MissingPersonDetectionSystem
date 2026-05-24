<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MissingPersonController;
use App\Http\Controllers\Api\DetectionController;
use App\Http\Controllers\Api\SightingController;
use App\Http\Controllers\Api\EvidenceController;
use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\CameraController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\JurisdictionController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for the Missing Person
| Detection System. These routes are loaded by the RouteServiceProvider
| and assigned to the "api" middleware group.
|
*/

// Public auth routes
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('reset-password', [AuthController::class, 'resetPassword']);
});

// Protected routes requiring authentication
Route::middleware('auth:sanctum')->group(function () {

    // Auth (authenticated user management)
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);
    Route::put('profile', [AuthController::class, 'updateProfile']);
    Route::put('password', [AuthController::class, 'changePassword']);

    // Missing Persons (Cases)
    Route::apiResource('cases', MissingPersonController::class);
    Route::put('cases/{id}/status', [MissingPersonController::class, 'updateStatus']);
    Route::put('cases/{id}/assign', [MissingPersonController::class, 'assignOfficer']);
    Route::get('cases-stats', [MissingPersonController::class, 'getStatistics']);
    Route::get('search', [MissingPersonController::class, 'search']);

    // Detections (AI-powered face detection results)
    Route::apiResource('detections', DetectionController::class)->only(['index', 'store', 'show']);
    Route::put('detections/{id}/verify', [DetectionController::class, 'verify']);
    Route::get('recent-detections', [DetectionController::class, 'getRecentDetections']);
    Route::get('detection-stats', [DetectionController::class, 'getDetectionStats']);

    // Sightings (manual public/field reports)
    Route::apiResource('sightings', SightingController::class)->only(['index', 'store', 'show']);
    Route::put('sightings/{id}/verify', [SightingController::class, 'verify']);
    Route::get('pending-sightings', [SightingController::class, 'getPendingSightings']);

    // Evidence (photos, videos, documents)
    Route::apiResource('evidence', EvidenceController::class);
    Route::get('evidence/{id}/download', [EvidenceController::class, 'download']);

    // Alerts (notifications)
    Route::apiResource('alerts', AlertController::class)->only(['index']);
    Route::put('alerts/{id}/read', [AlertController::class, 'markAsRead']);
    Route::put('alerts-read-all', [AlertController::class, 'markAllAsRead']);
    Route::get('alerts-unread-count', [AlertController::class, 'getUnreadCount']);

    // Dashboard
    Route::prefix('dashboard')->group(function () {
        Route::get('stats', [DashboardController::class, 'getStats']);
        Route::get('activity', [DashboardController::class, 'getRecentActivity']);
        Route::get('trends', [DashboardController::class, 'getDetectionTrends']);
        Route::get('regional', [DashboardController::class, 'getRegionalStats']);
        Route::get('heatmap', [DashboardController::class, 'getHeatmapData']);
    });

    // Cameras (CCTV management)
    Route::apiResource('cameras', CameraController::class);
    Route::post('cameras/{id}/health-check', [CameraController::class, 'healthCheck']);
    Route::post('cameras/{id}/start-monitoring', [CameraController::class, 'startMonitoring']);
    Route::post('cameras/{id}/stop-monitoring', [CameraController::class, 'stopMonitoring']);

    // Admin-only routes
    Route::middleware('role:admin,super_admin')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::get('officers', [UserController::class, 'getOfficers']);
        Route::apiResource('jurisdictions', JurisdictionController::class);
    });
});
