<?php

namespace App\Jobs;

use App\Enums\AlertChannel;
use App\Enums\AlertType;
use App\Events\NewDetectionEvent;
use App\Models\Alert;
use App\Models\Camera;
use App\Models\Detection;
use App\Models\MissingPerson;
use App\Models\User;
use App\Notifications\HighConfidenceAlertNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ProcessCCTVDetectionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $maxExceptions = 3;
    public int $backoff = 30;

    public float $confidenceThreshold = 0.65;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public readonly int $cameraId,
        public readonly string $frameBase64,
        public readonly string $timestamp,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $camera = Camera::with('jurisdiction')->findOrFail($this->cameraId);

        $aiServiceUrl = config('services.ai.url', 'http://localhost:5000');

        try {
            $response = Http::timeout(90)->post("{$aiServiceUrl}/api/detect/frame", [
                'image' => $this->frameBase64,
                'camera_id' => $this->cameraId,
                'timestamp' => $this->timestamp,
                'threshold' => $this->confidenceThreshold,
            ]);

            if (!$response->successful()) {
                Log::error('ProcessCCTVDetectionJob: AI service error', [
                    'camera_id' => $this->cameraId,
                    'status' => $response->status(),
                ]);
                throw new \RuntimeException("AI service returned status: {$response->status()}");
            }

            $data = $response->json();

            if (empty($data['faces'])) {
                Log::debug('ProcessCCTVDetectionJob: No faces detected', [
                    'camera_id' => $this->cameraId,
                ]);
                return;
            }

            $screenshotPath = $this->saveScreenshot($this->cameraId, $this->timestamp, $this->frameBase64);

            foreach ($data['faces'] as $face) {
                $matches = $face['matches'] ?? [];

                if (empty($matches)) {
                    continue;
                }

                usort($matches, fn(array $a, array $b) => $b['confidence'] <=> $a['confidence']);
                $bestMatch = $matches[0];
                $confidence = $bestMatch['confidence'];
                $matchedPersonId = $bestMatch['person_id'];

                if ($confidence < $this->confidenceThreshold) {
                    continue;
                }

                $missingPerson = MissingPerson::find($matchedPersonId);

                if (!$missingPerson) {
                    Log::warning('ProcessCCTVDetectionJob: Missing person not found', [
                        'person_id' => $matchedPersonId,
                    ]);
                    continue;
                }

                $detection = Detection::create([
                    'missing_person_id' => $matchedPersonId,
                    'source' => 'cctv',
                    'source_id' => $this->cameraId,
                    'confidence' => $confidence,
                    'screenshot_path' => $screenshotPath,
                    'location' => $camera->location,
                    'latitude' => $camera->latitude,
                    'longitude' => $camera->longitude,
                    'detected_at' => $this->timestamp,
                    'metadata' => json_encode([
                        'camera_id' => $this->cameraId,
                        'camera_name' => $camera->name,
                        'face_box' => $face['box'] ?? null,
                        'all_matches' => array_slice($matches, 0, 5),
                        'jurisdiction_id' => $camera->jurisdiction_id,
                    ]),
                    'is_verified' => false,
                ]);

                event(new NewDetectionEvent($detection, $missingPerson));

                $this->sendAlerts($detection, $missingPerson, $camera, $confidence);

                Log::info('ProcessCCTVDetectionJob: Detection created', [
                    'camera_id' => $this->cameraId,
                    'detection_id' => $detection->id,
                    'confidence' => $confidence,
                    'person_id' => $matchedPersonId,
                ]);
            }

        } catch (Throwable $e) {
            Log::error('ProcessCCTVDetectionJob: Failed', [
                'camera_id' => $this->cameraId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Save the CCTV frame as a screenshot.
     */
    private function saveScreenshot(int $cameraId, string $timestamp, string $base64Frame): string
    {
        $timestampSlug = str_replace([':', ' ', '-'], '_', $timestamp);
        $path = "detections/cctv/camera_{$cameraId}/frame_{$timestampSlug}.jpg";

        $imageData = base64_decode($base64Frame);

        if ($imageData === false) {
            throw new \RuntimeException('Failed to decode base64 frame');
        }

        Storage::put($path, $imageData);

        return $path;
    }

    /**
     * Send alerts to assigned officers for the match.
     */
    private function sendAlerts(Detection $detection, MissingPerson $person, Camera $camera, float $confidence): void
    {
        $officers = collect();

        if ($person->assigned_officer_id) {
            $officer = User::find($person->assigned_officer_id);
            if ($officer) {
                $officers->push($officer);
            }
        }

        if ($camera->jurisdiction_id) {
            $jurisdictionOfficers = User::where('jurisdiction_id', $camera->jurisdiction_id)
                ->where('role', 'officer')
                ->where('is_active', true)
                ->get();

            $officers = $officers->merge($jurisdictionOfficers);
        }

        $officers = $officers->unique('id');

        $priority = $confidence > 0.85 ? 'urgent' : 'high';
        $channel = $confidence > 0.85 ? AlertChannel::SMS : AlertChannel::DASHBOARD;

        foreach ($officers as $officer) {
            $alert = Alert::create([
                'type' => AlertType::FACE_MATCH,
                'title' => sprintf(
                    'CCTV Match: %s detected at %s',
                    $person->full_name,
                    $camera->name
                ),
                'message' => sprintf(
                    '%s was detected on camera "%s" at %s with %.1f%% confidence.',
                    $person->full_name,
                    $camera->name,
                    $camera->location ?? 'Unknown location',
                    $confidence * 100
                ),
                'detection_id' => $detection->id,
                'missing_person_id' => $person->id,
                'user_id' => $officer->id,
                'channel' => $channel,
                'priority' => $priority,
                'data' => json_encode([
                    'detection_id' => $detection->id,
                    'camera_id' => $camera->id,
                    'camera_name' => $camera->name,
                    'confidence' => $confidence,
                ]),
            ]);

            SendAlertJob::dispatch($alert->id);

            if ($confidence > 0.85) {
                $officer->notify(new HighConfidenceAlertNotification($detection, $camera));
            }
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(Throwable $exception): void
    {
        Log::error('ProcessCCTVDetectionJob: Permanently failed', [
            'camera_id' => $this->cameraId,
            'timestamp' => $this->timestamp,
            'error' => $exception->getMessage(),
        ]);
    }
}
