<?php

return [

    /*
    |--------------------------------------------------------------------------
    | AI Service Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for the Python-based AI/ML microservice that handles
    | face detection, embedding generation, and CCTV stream processing.
    |
    */

    'url' => env('AI_SERVICE_URL', 'http://localhost:5000'),

    'timeout' => env('AI_SERVICE_TIMEOUT', 120),

    'retry_attempts' => env('AI_SERVICE_RETRY_ATTEMPTS', 3),

    'retry_delay_ms' => env('AI_SERVICE_RETRY_DELAY_MS', 1000),

    'endpoints' => [
        'generate_embedding' => '/api/generate-embedding',
        'compare_face' => '/api/compare-face',
        'process_cctv' => '/api/process-cctv',
        'detect_face' => '/api/detect-face',
        'rebuild_index' => '/api/rebuild-index',
        'start_stream' => '/api/start-stream',
        'stop_stream' => '/api/stop-stream',
        'health' => '/api/health',
    ],

    /*
    |--------------------------------------------------------------------------
    | Face Detection Thresholds
    |--------------------------------------------------------------------------
    |
    | Confidence thresholds for face detection and matching.
    |
    */

    'face_match_threshold' => env('FACE_MATCH_THRESHOLD', 0.65),

    'face_detection_confidence' => env('FACE_DETECTION_CONFIDENCE', 0.80),

    /*
    |--------------------------------------------------------------------------
    | CCTV Processing
    |--------------------------------------------------------------------------
    |
    | Settings for CCTV stream processing.
    |
    */

    'cctv' => [
        'frame_skip' => env('CCTV_FRAME_SKIP', 5),
        'max_concurrent_streams' => env('CCTV_MAX_STREAMS', 10),
        'reconnect_attempts' => env('CCTV_RECONNECT_ATTEMPTS', 3),
        'reconnect_delay_seconds' => env('CCTV_RECONNECT_DELAY', 5),
    ],

];
