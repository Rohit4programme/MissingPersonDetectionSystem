<?php

namespace App\Jobs;

use App\Enums\AlertChannel;
use App\Enums\AlertType;
use App\Enums\SightingStatus;
use App\Events\NewDetectionEvent;
use App\Models\Alert;
use App\Models\Detection;
use App\Models\Sighting;
use App\Notifications\FaceMatchNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ProcessSightingJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $maxExceptions = 3;
    public int $backoff = 60;

    public float $confidenceThreshold = 0.70;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public readonly int $sightingId,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $sighting = Sighting::with(['missingPerson', 'reporter'])->findOrFail($this->sightingId);

        $imagePath = $sighting->image_path;

        if (!$imagePath || !Storage::exists($imagePath)) {
            Log::warning('ProcessSightingJob: Sighting image not found', [
                'sighting_id' => $this->sightingId,
                'image_path' => $imagePath,
            ]);
            $sighting->update([
                'status' => SightingStatus::REJECTED,
                'ai_notes' => 'Image not found or corrupted.',
            ]);
            return;
        }

        $imageData = Storage::get($imagePath);
        $base64Image = base64_encode($imageData);

        $aiServiceUrl = config('services.ai.url', 'http://localhost:5000');

        try {
            $response = Http::timeout(120)->post("{$aiServiceUrl}/api/face/compare-all", [
                'image' => $base64Image,
                'threshold' => $this->confidenceThreshold,
            ]);

            if (!$response->successful()) {
                Log::error('ProcessSightingJob: AI service error', [
                    'sighting_id' => $this->sightingId,
                    'status' => $response->status(),
                ]);
                throw new \RuntimeException("AI service returned status: {$response->status()}");
            }

            $data = $response->json();
            $matches = $data['matches'] ?? [];

            if (empty($matches)) {
                Log::info('ProcessSightingJob: No matches found', [
                    'sighting_id' => $this->sightingId,
                ]);
                $sighting->update([
                    'status' => SightingStatus::PENDING,
                    'ai_similarity_score' => $data['best_score'] ?? 0.0,
                    'ai_notes' => 'No matching faces found in the database.',
                ]);
                return;
            }

            usort($matches, fn(array $a, array $b) => $b['confidence'] <=> $a['confidence']);
            $bestMatch = $matches[0];
            $confidence = $bestMatch['confidence'];
            $matchedPersonId = $bestMatch['person_id'];

            $sighting->update([
                'ai_similarity_score' => $confidence,
                'matched_person_id' => $matchedPersonId,
                'status' => $confidence > 0.85
                    ? SightingStatus::VERIFIED
                    : SightingStatus::PENDING,
                'ai_notes' => sprintf(
                    'Match found with %.1f%% confidence against person ID %d.',
                    $confidence * 100,
                    $matchedPersonId
                ),
            ]);

            $detection = Detection::create([
                'missing_person_id' => $matchedPersonId,
                'source' => 'public_upload',
                'source_id' => $this->sightingId,
                'confidence' => $confidence,
                'screenshot_path' => $imagePath,
                'location' => $sighting->location,
                'latitude' => $sighting->latitude,
                'longitude' => $sighting->longitude,
                'detected_at' => $sighting->sighted_at ?? now(),
                'metadata' => json_encode([
                    'sighting_id' => $this->sightingId,
                    'reporter_id' => $sighting->reporter_id,
                    'all_matches' => array_slice($matches, 0, 5),
                ]),
                'is_verified' => false,
            ]);

            $missingPerson = $detection->missingPerson;

            event(new NewDetectionEvent($detection, $missingPerson));

            if ($missingPerson->assigned_officer_id) {
                $missingPerson->assignedOfficer->notify(
                    new FaceMatchNotification($detection)
                );
            }

            $alert = Alert::create([
                'type' => AlertType::FACE_MATCH,
                'title' => "Potential match detected for {$missingPerson->full_name}",
                'message' => sprintf(
                    'A sighting submitted by the public has been matched with %.1f%% confidence. Location: %s',
                    $confidence * 100,
                    $sighting->location ?? 'Unknown'
                ),
                'detection_id' => $detection->id,
                'missing_person_id' => $matchedPersonId,
                'user_id' => $missingPerson->assigned_officer_id,
                'channel' => AlertChannel::DASHBOARD,
                'priority' => $confidence > 0.85 ? 'urgent' : 'high',
                'data' => json_encode([
                    'detection_id' => $detection->id,
                    'confidence' => $confidence,
                ]),
            ]);

            SendAlertJob::dispatch($alert->id);

            Log::info('ProcessSightingJob: Match found and alert sent', [
                'sighting_id' => $this->sightingId,
                'detection_id' => $detection->id,
                'confidence' => $confidence,
                'matched_person_id' => $matchedPersonId,
            ]);

        } catch (Throwable $e) {
            Log::error('ProcessSightingJob: Failed', [
                'sighting_id' => $this->sightingId,
                'error' => $e->getMessage(),
            ]);

            $sighting->update([
                'ai_notes' => 'Processing failed: ' . $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(Throwable $exception): void
    {
        Log::error('ProcessSightingJob: Permanently failed', [
            'sighting_id' => $this->sightingId,
            'error' => $exception->getMessage(),
        ]);

        try {
            $sighting = Sighting::find($this->sightingId);
            if ($sighting) {
                $sighting->update([
                    'status' => SightingStatus::REJECTED,
                    'ai_notes' => 'Automated processing failed. Manual review required.',
                ]);
            }
        } catch (Throwable $e) {
            Log::error('ProcessSightingJob: Failed to update sighting on failure', [
                'sighting_id' => $this->sightingId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
