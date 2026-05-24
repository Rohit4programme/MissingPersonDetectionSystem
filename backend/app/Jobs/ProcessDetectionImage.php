<?php

namespace App\Jobs;

use App\Events\DetectionCreated;
use App\Models\Detection;
use App\Models\Sighting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Exception;

class ProcessDetectionImage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The maximum number of seconds the job can run.
     */
    public int $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $sighting_id
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $sighting = Sighting::with('missingPerson')->findOrFail($this->sighting_id);

        if (!$sighting->image_path) {
            Log::warning("No image found for sighting {$this->sighting_id}");
            return;
        }

        $aiServiceUrl = config('services.ai.url', 'http://localhost:5000');
        $imagePath = Storage::disk('public')->path($sighting->image_path);

        if (!file_exists($imagePath)) {
            Log::error("Image file not found: {$sighting->image_path}");
            return;
        }

        try {
            $response = Http::timeout(30)
                ->attach(
                    'image',
                    file_get_contents($imagePath),
                    basename($sighting->image_path)
                )
                ->post("{$aiServiceUrl}/api/compare-face", [
                    'sighting_id' => $this->sighting_id,
                    'person_id' => $sighting->missing_person_id,
                ]);

            if (!$response->successful()) {
                Log::error("AI service error for sighting {$this->sighting_id}: " . $response->body());
                return;
            }

            $data = $response->json();
            $similarityScore = (float) ($data['similarity_score'] ?? 0);

            // Update sighting with AI similarity score
            $sighting->update([
                'ai_similarity_score' => $similarityScore,
                'ai_processed_at' => now(),
                'ai_metadata' => json_encode($data['metadata'] ?? []),
            ]);

            // If score > 0.70, create a detection record
            if ($similarityScore > 0.70) {
                $detection = Detection::create([
                    'missing_person_id' => $sighting->missing_person_id,
                    'sighting_id' => $sighting->id,
                    'confidence_score' => $similarityScore,
                    'source' => 'public_sighting',
                    'latitude' => $sighting->latitude,
                    'longitude' => $sighting->longitude,
                    'location_address' => $sighting->location_address,
                    'screenshot_path' => $sighting->image_path,
                    'detected_at' => now(),
                    'is_verified' => false,
                    'metadata' => json_encode($data['metadata'] ?? []),
                ]);

                // Update sighting status
                $sighting->update(['status' => 'matched']);

                // Fire detection created event
                DetectionCreated::dispatch($detection);

                // If score > 0.85, dispatch high-confidence alert
                if ($similarityScore > 0.85) {
                    SendAlert::dispatch($detection->id);
                }

                Log::info("Detection created from sighting {$this->sighting_id} with score {$similarityScore}");
            } else {
                $sighting->update(['status' => 'processed']);
                Log::info("Sighting {$this->sighting_id} processed, score {$similarityScore} below threshold");
            }

        } catch (Exception $e) {
            Log::error("Failed to process detection image for sighting {$this->sighting_id}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(Exception $exception): void
    {
        Log::error("ProcessDetectionImage job failed for sighting {$this->sighting_id}: " . $exception->getMessage());

        $sighting = Sighting::find($this->sighting_id);
        if ($sighting) {
            $sighting->update(['status' => 'processing_failed']);
        }
    }
}