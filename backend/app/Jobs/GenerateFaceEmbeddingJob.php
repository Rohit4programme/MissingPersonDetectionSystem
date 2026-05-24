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
use Throwable;

class GenerateFaceEmbeddingJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $maxExceptions = 3;
    public int $backoff = 30;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public readonly int $personId,
        public readonly string $imagePath,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $person = MissingPerson::findOrFail($this->personId);

        $imageData = Storage::get($this->imagePath);

        if (!$imageData) {
            Log::error('GenerateFaceEmbeddingJob: Image not found', [
                'person_id' => $this->personId,
                'image_path' => $this->imagePath,
            ]);
            throw new \RuntimeException("Image not found at path: {$this->imagePath}");
        }

        $base64Image = base64_encode($imageData);

        $aiServiceUrl = config('services.ai.url', 'http://localhost:5000');

        try {
            $response = Http::timeout(60)->post("{$aiServiceUrl}/api/face/embed", [
                'image' => $base64Image,
            ]);

            if (!$response->successful()) {
                Log::error('GenerateFaceEmbeddingJob: AI service error', [
                    'person_id' => $this->personId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new \RuntimeException("AI service returned status: {$response->status()}");
            }

            $data = $response->json();

            if (empty($data['embedding'])) {
                throw new \RuntimeException('AI service returned empty embedding');
            }

            $embedding = $data['embedding'];

            FaceEmbedding::updateOrCreate(
                [
                    'missing_person_id' => $this->personId,
                    'image_path' => $this->imagePath,
                ],
                [
                    'embedding' => json_encode($embedding),
                    'model' => $data['model'] ?? 'facenet-v1',
                    'is_primary' => FaceEmbedding::where('missing_person_id', $this->personId)->count() === 0,
                    'metadata' => json_encode([
                        'face_detected' => $data['face_detected'] ?? true,
                        'face_quality' => $data['quality'] ?? null,
                        'face_box' => $data['face_box'] ?? null,
                    ]),
                ]
            );

            $this->updateFaissIndex($this->personId, $embedding);

            Log::info('GenerateFaceEmbeddingJob: Embedding generated successfully', [
                'person_id' => $this->personId,
                'embedding_dimensions' => count($embedding),
            ]);

        } catch (Throwable $e) {
            Log::error('GenerateFaceEmbeddingJob: Failed', [
                'person_id' => $this->personId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Update the FAISS index with the new embedding.
     */
    private function updateFaissIndex(int $personId, array $embedding): void
    {
        $aiServiceUrl = config('services.ai.url', 'http://localhost:5000');

        try {
            $response = Http::timeout(30)->post("{$aiServiceUrl}/api/faiss/update", [
                'person_id' => $personId,
                'embedding' => $embedding,
            ]);

            if (!$response->successful()) {
                Log::warning('GenerateFaceEmbeddingJob: FAISS index update failed', [
                    'person_id' => $personId,
                    'status' => $response->status(),
                ]);
            }
        } catch (Throwable $e) {
            Log::warning('GenerateFaceEmbeddingJob: FAISS index update exception', [
                'person_id' => $personId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(Throwable $exception): void
    {
        Log::error('GenerateFaceEmbeddingJob: Permanently failed', [
            'person_id' => $this->personId,
            'image_path' => $this->imagePath,
            'error' => $exception->getMessage(),
        ]);
    }
}
