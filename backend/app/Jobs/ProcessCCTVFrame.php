<?php

namespace App\Jobs;

use App\Events\DetectionCreated;
use App\Models\Camera;
use App\Models\Detection;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Exception;

class ProcessCCTVFrame implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The maximum number of seconds the job can run.
     */
    public int $timeout = 30;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $camera_id,
        public string $frame
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $camera = Camera::findOrFail($this->camera_id);

        $aiServiceUrl = config('services.ai.url', 'http://localhost:5000');

        try {
            $response = Http::timeout(15)
                ->post("{$aiServiceUrl}/api/process-cctv", [
                    'camera_id' => $this->camera_id,
                    'frame' => $this->frame,
                    'jurisdiction_id' => $camera->jurisdiction_id,
                ]);

            if (!$response->successful()) {
                Log::error("AI service error for camera {$this->camera_id}: " . $response->body());
                return;
            }

            $data = $response->json();
            $matches = $data['matches'] ?? [];

            if (empty($matches)) {
                Log::debug("No matches found in CCTV frame from camera {$this->camera_id}");
                return;
            }

            // Save the frame as evidence
            $framePath = $this->saveFrame($camera);

            foreach ($matches as $match) {
                $confidence = (float) ($match['confidence'] ?? 0);

                if ($confidence < 0.70) {
                    continue;
                }

                $detection = Detection::create([
                    'missing_person_id' => $match['person_id'],
                    'camera_id' => $this->camera_id,
                    'confidence_score' => $confidence,
                    'source' => 'cctv',
                    'latitude' => $match['latitude'] ?? $camera->latitude,
                    'longitude' => $match['longitude'] ?? $camera->longitude,
                    'location_address' => $camera->location_name,
                    'screenshot_path' => $framePath,
                    'detected_at' => now(),
                    'is_verified' => false,
                    'metadata' => json_encode([
                        'camera_name' => $camera->name,
                        'camera_type' => $camera->type,
                        'bounding_box' => $match['bounding_box'] ?? null,
                        'ai_model_version' => $data['model_version'] ?? null,
                    ]),
                ]);

                // Fire detection created event
                DetectionCreated::dispatch($detection);

                // If high confidence, dispatch alert
                if ($confidence > 0.85) {
                    SendAlert::dispatch($detection->id);
                }

                Log::info("CCTV detection created from camera {$this->camera_id}, person {$match['person_id']}, score {$confidence}");
            }

        } catch (Exception $e) {
            Log::error("Failed to process CCTV frame from camera {$this->camera_id}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Save the CCTV frame as evidence.
     */
    protected function saveFrame(Camera $camera): string
    {
        $timestamp = now()->format('Y-m-d_H-i-s');
        $filename = "cctv/{$camera->id}/frame_{$timestamp}.jpg";
        $imageData = base64_decode($this->frame);

        Storage::disk('public')->put($filename, $imageData);

        return $filename;
    }

    /**
     * Handle a job failure.
     */
    public function failed(Exception $exception): void
    {
        Log::error("ProcessCCTVFrame job failed for camera {$this->camera_id}: " . $exception->getMessage());
    }
}