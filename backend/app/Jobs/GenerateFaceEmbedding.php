<?php

namespace App\Jobs;

use App\Models\FaceEmbedding;
use App\Models\MissingPerson;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Exception;

class GenerateFaceEmbedding implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The maximum number of seconds the job can run.
     */
    public int $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $person_id
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $person = MissingPerson::with('photos')->findOrFail($this->person_id);

        if ($person->photos->isEmpty()) {
            Log::warning("No photos found for person {$this->person_id}, skipping embedding generation.");
            return;
        }

        $aiServiceUrl = config('services.ai.url', 'http://localhost:5000');
        $embeddingsGenerated = 0;

        foreach ($person->photos as $photo) {
            try {
                $photoPath = Storage::disk('public')->path($photo->file_path);

                if (!file_exists($photoPath)) {
                    Log::error("Photo file not found: {$photo->file_path}");
                    continue;
                }

                $response = Http::timeout(30)
                    ->attach(
                        'image',
                        file_get_contents($photoPath),
                        basename($photo->file_path)
                    )
                    ->post("{$aiServiceUrl}/api/generate-embedding", [
                        'person_id' => $this->person_id,
                        'photo_id' => $photo->id,
                    ]);

                if ($response->successful()) {
                    $data = $response->json();

                    FaceEmbedding::updateOrCreate(
                        [
                            'missing_person_id' => $this->person_id,
                            'photo_id' => $photo->id,
                        ],
                        [
                            'embedding' => json_encode($data['embedding']),
                            'model_version' => $data['model_version'] ?? 'v1.0',
                            'is_active' => true,
                        ]
                    );

                    $embeddingsGenerated++;
                } else {
                    Log::error("AI service returned error for photo {$photo->id}: " . $response->body());
                }
            } catch (Exception $e) {
                Log::error("Failed to generate embedding for photo {$photo->id}: " . $e->getMessage());
                throw $e;
            }
        }

        if ($embeddingsGenerated > 0) {
            $this->rebuildIndex($aiServiceUrl);
        }

        Log::info("Generated {$embeddingsGenerated} embeddings for person {$this->person_id}");
    }

    /**
     * Call AI service to rebuild the FAISS index.
     */
    protected function rebuildIndex(string $aiServiceUrl): void
    {
        try {
            $response = Http::timeout(60)
                ->post("{$aiServiceUrl}/api/rebuild-index");

            if ($response->successful()) {
                Log::info('FAISS index rebuilt successfully');
            } else {
                Log::error("Failed to rebuild FAISS index: " . $response->body());
            }
        } catch (Exception $e) {
            Log::error("Failed to rebuild FAISS index: " . $e->getMessage());
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(Exception $exception): void
    {
        Log::error("GenerateFaceEmbedding job failed for person {$this->person_id}: " . $exception->getMessage());

        // Optionally notify admin of failure
        // NotificationService::notifyAdmins('Embedding generation failed', [...]);
    }
}