<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class AIService
{
    private string $baseUrl;
    private int $timeout;
    private int $retryAttempts;
    private int $retryDelayMs;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('ai_service.url'), '/');
        $this->timeout = config('ai_service.timeout', 120);
        $this->retryAttempts = config('ai_service.retry_attempts', 3);
        $this->retryDelayMs = config('ai_service.retry_delay_ms', 1000);
    }

    /**
     * Create a configured HTTP client instance with retry logic.
     */
    private function client(): PendingRequest
    {
        return Http::timeout($this->timeout)
            ->retry($this->retryAttempts, $this->retryDelayMs)
            ->withHeaders([
                'Accept' => 'application/json',
            ]);
    }

    /**
     * Get the full URL for a given endpoint key.
     */
    private function endpoint(string $key): string
    {
        $path = config("ai_service.endpoints.{$key}");

        if (!$path) {
            throw new RuntimeException("Unknown AI service endpoint: {$key}");
        }

        return $this->baseUrl . $path;
    }

    /**
     * Generate a face embedding from an image file.
     *
     * @param  string  $imagePath  Local file path or storage path to the image
     * @return array  The embedding vector and metadata
     *
     * @throws RuntimeException
     */
    public function generateEmbedding(string $imagePath): array
    {
        $this->ensureFileExists($imagePath);

        try {
            $response = $this->client()
                ->attach(
                    'image',
                    file_get_contents($imagePath),
                    basename($imagePath)
                )
                ->post($this->endpoint('generate_embedding'));

            $this->ensureSuccessfulResponse($response, 'generateEmbedding');

            return $response->json();
        } catch (RuntimeException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('AI Service: Failed to generate embedding', [
                'image_path' => $imagePath,
                'error' => $e->getMessage(),
            ]);
            throw new RuntimeException(
                'Failed to generate embedding: ' . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * Compare a face image against known missing persons.
     *
     * @param  string       $imagePath  Local file path to the image
     * @param  int|null     $personId   Optional: compare against a specific missing person only
     * @return array        Match results including confidence scores
     *
     * @throws RuntimeException
     */
    public function compareFace(string $imagePath, ?int $personId = null): array
    {
        $this->ensureFileExists($imagePath);

        try {
            $request = $this->client()
                ->attach(
                    'image',
                    file_get_contents($imagePath),
                    basename($imagePath)
                );

            if ($personId !== null) {
                $request = $request->field('person_id', $personId);
            }

            $response = $request->post($this->endpoint('compare_face'));

            $this->ensureSuccessfulResponse($response, 'compareFace');

            return $response->json();
        } catch (RuntimeException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('AI Service: Failed to compare face', [
                'image_path' => $imagePath,
                'person_id' => $personId,
                'error' => $e->getMessage(),
            ]);
            throw new RuntimeException(
                'Failed to compare face: ' . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * Process a CCTV frame for face detection.
     *
     * @param  string   $frameBase64  Base64-encoded image frame
     * @param  int      $cameraId     The camera ID that produced this frame
     * @return array    Detection results
     *
     * @throws RuntimeException
     */
    public function processCCTVFrame(string $frameBase64, int $cameraId): array
    {
        try {
            $response = $this->client()
                ->post($this->endpoint('process_cctv'), [
                    'frame' => $frameBase64,
                    'camera_id' => $cameraId,
                ]);

            $this->ensureSuccessfulResponse($response, 'processCCTVFrame');

            return $response->json();
        } catch (RuntimeException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('AI Service: Failed to process CCTV frame', [
                'camera_id' => $cameraId,
                'error' => $e->getMessage(),
            ]);
            throw new RuntimeException(
                'Failed to process CCTV frame: ' . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * Rebuild the FAISS face index from the database.
     *
     * @return array  Status of the rebuild operation
     *
     * @throws RuntimeException
     */
    public function rebuildIndex(): array
    {
        try {
            $response = $this->client()
                ->post($this->endpoint('rebuild_index'));

            $this->ensureSuccessfulResponse($response, 'rebuildIndex');

            return $response->json();
        } catch (RuntimeException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('AI Service: Failed to rebuild index', [
                'error' => $e->getMessage(),
            ]);
            throw new RuntimeException(
                'Failed to rebuild index: ' . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * Start processing an RTSP camera stream.
     *
     * @param  string   $rtspUrl   The RTSP URL of the camera
     * @param  int      $cameraId  The camera ID in the database
     * @return array    Stream status and session information
     *
     * @throws RuntimeException
     */
    public function startStream(string $rtspUrl, int $cameraId): array
    {
        try {
            $response = $this->client()
                ->post($this->endpoint('start_stream'), [
                    'rtsp_url' => $rtspUrl,
                    'camera_id' => $cameraId,
                ]);

            $this->ensureSuccessfulResponse($response, 'startStream');

            return $response->json();
        } catch (RuntimeException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('AI Service: Failed to start stream', [
                'camera_id' => $cameraId,
                'rtsp_url' => $rtspUrl,
                'error' => $e->getMessage(),
            ]);
            throw new RuntimeException(
                'Failed to start stream: ' . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * Stop processing an RTSP camera stream.
     *
     * @param  int  $cameraId  The camera ID to stop
     * @return array  Confirmation of stream stop
     *
     * @throws RuntimeException
     */
    public function stopStream(int $cameraId): array
    {
        try {
            $response = $this->client()
                ->post($this->endpoint('stop_stream'), [
                    'camera_id' => $cameraId,
                ]);

            $this->ensureSuccessfulResponse($response, 'stopStream');

            return $response->json();
        } catch (RuntimeException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('AI Service: Failed to stop stream', [
                'camera_id' => $cameraId,
                'error' => $e->getMessage(),
            ]);
            throw new RuntimeException(
                'Failed to stop stream: ' . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * Check if the AI service is healthy and reachable.
     *
     * @return bool
     */
    public function healthCheck(): bool
    {
        try {
            $response = Http::timeout(10)
                ->get($this->endpoint('health'));

            return $response->successful();
        } catch (\Exception $e) {
            Log::warning('AI Service: Health check failed', [
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Ensure a file exists at the given path.
     *
     * @throws RuntimeException
     */
    private function ensureFileExists(string $path): void
    {
        if (!file_exists($path)) {
            throw new RuntimeException("File not found: {$path}");
        }
    }

    /**
     * Ensure the AI service responded successfully.
     *
     * @throws RuntimeException
     */
    private function ensureSuccessfulResponse(Response $response, string $operation): void
    {
        if (!$response->successful()) {
            $errorMessage = $response->json('error') ?? $response->body();
            $statusCode = $response->status();

            Log::error("AI Service: {$operation} failed", [
                'status' => $statusCode,
                'response' => $errorMessage,
            ]);

            throw new RuntimeException(
                "AI service {$operation} failed (HTTP {$statusCode}): {$errorMessage}"
            );
        }
    }
}
