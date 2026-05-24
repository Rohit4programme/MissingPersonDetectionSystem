<?php

namespace App\Jobs;

use App\Events\NewDetectionEvent;
use App\Models\Alert;
use App\Models\Detection;
use App\Models\MissingPerson;
use App\Enums\AlertType;
use App\Enums\AlertChannel;
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

class ProcessVideoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $maxExceptions = 3;
    public int $backoff = 120;
    public int $timeout = 1800; // 30 minutes

    public float $confidenceThreshold = 0.70;
    public int $frameIntervalSeconds = 2;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public readonly string $filePath,
        public readonly int $caseId,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $person = MissingPerson::findOrFail($this->caseId);

        if (!Storage::exists($this->filePath)) {
            Log::error('ProcessVideoJob: Video file not found', [
                'file_path' => $this->filePath,
                'case_id' => $this->caseId,
            ]);
            throw new \RuntimeException("Video file not found: {$this->filePath}");
        }

        $tempDir = storage_path('app/temp/video_' . $this->caseId . '_' . time());
        mkdir($tempDir, 0755, true);

        try {
            $frames = $this->extractFrames($this->filePath, $tempDir);

            if (empty($frames)) {
                Log::warning('ProcessVideoJob: No frames extracted', [
                    'file_path' => $this->filePath,
                    'case_id' => $this->caseId,
                ]);
                return;
            }

            $totalMatches = 0;
            $detections = collect();

            foreach ($frames as $index => $framePath) {
                try {
                    $match = $this->processFrame($framePath, $index, $person);

                    if ($match) {
                        $totalMatches++;
                        $detections->push($match);

                        Log::info('ProcessVideoJob: Match found in frame', [
                            'case_id' => $this->caseId,
                            'frame_index' => $index,
                            'confidence' => $match->confidence,
                        ]);
                    }
                } catch (Throwable $e) {
                    Log::warning('ProcessVideoJob: Frame processing failed', [
                        'case_id' => $this->caseId,
                        'frame_index' => $index,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            Log::info('ProcessVideoJob: Video processing complete', [
                'case_id' => $this->caseId,
                'total_frames' => count($frames),
                'total_matches' => $totalMatches,
                'detections_created' => $detections->count(),
            ]);

        } finally {
            $this->cleanupTempDir($tempDir);
        }
    }

    /**
     * Extract frames from the video at specified intervals.
     *
     * @return array List of frame file paths
     */
    private function extractFrames(string $videoPath, string $outputDir): array
    {
        $fullPath = Storage::path($videoPath);
        $outputPattern = "{$outputDir}/frame_%04d.jpg";

        $ffmpegPath = config('services.ffmpeg.path', 'ffmpeg');

        $interval = $this->frameIntervalSeconds;

        $command = sprintf(
            '%s -i "%s" -vf "fps=1/%d" -q:v 2 "%s" 2>&1',
            $ffmpegPath,
            escapeshellarg($fullPath),
            $interval,
            $outputPattern
        );

        exec($command, $output, $returnCode);

        if ($returnCode !== 0) {
            Log::error('ProcessVideoJob: FFmpeg failed', [
                'command' => $command,
                'output' => implode("\n", $output),
                'return_code' => $returnCode,
            ]);
            throw new \RuntimeException('Failed to extract video frames');
        }

        $frames = glob("{$outputDir}/frame_*.jpg");
        sort($frames);

        return $frames;
    }

    /**
     * Process a single frame for face detection and matching.
     */
    private function processFrame(string $framePath, int $frameIndex, MissingPerson $person): ?Detection
    {
        $imageData = file_get_contents($framePath);
        $base64Image = base64_encode($imageData);

        $aiServiceUrl = config('services.ai.url', 'http://localhost:5000');

        $response = Http::timeout(60)->post("{$aiServiceUrl}/api/face/compare", [
            'image' => $base64Image,
            'person_id' => $person->id,
            'threshold' => $this->confidenceThreshold,
        ]);

        if (!$response->successful()) {
            throw new \RuntimeException("AI service returned status: {$response->status()}");
        }

        $data = $response->json();

        if (empty($data['match']) || ($data['confidence'] ?? 0) < $this->confidenceThreshold) {
            return null;
        }

        $confidence = $data['confidence'];
        $screenshotPath = $this->saveScreenshot($framePath, $this->caseId, $frameIndex);

        $detection = Detection::create([
            'missing_person_id' => $person->id,
            'source' => 'video',
            'source_id' => $this->caseId,
            'confidence' => $confidence,
            'screenshot_path' => $screenshotPath,
            'location' => $person->last_seen_location,
            'latitude' => $person->last_seen_latitude,
            'longitude' => $person->last_seen_longitude,
            'detected_at' => now(),
            'metadata' => json_encode([
                'video_path' => $this->filePath,
                'frame_index' => $frameIndex,
                'frame_timestamp' => $frameIndex * $this->frameIntervalSeconds,
                'face_box' => $data['face_box'] ?? null,
                'model' => $data['model'] ?? null,
            ]),
            'is_verified' => false,
        ]);

        event(new NewDetectionEvent($detection, $person));

        if ($confidence > 0.85 && $person->assigned_officer_id) {
            $person->assignedOfficer->notify(new FaceMatchNotification($detection));

            Alert::create([
                'type' => AlertType::FACE_MATCH,
                'title' => "Video match: {$person->full_name}",
                'message' => sprintf(
                    '%s detected in video analysis at frame %d with %.1f%% confidence.',
                    $person->full_name,
                    $frameIndex,
                    $confidence * 100
                ),
                'detection_id' => $detection->id,
                'missing_person_id' => $person->id,
                'user_id' => $person->assigned_officer_id,
                'channel' => AlertChannel::DASHBOARD,
                'priority' => $confidence > 0.90 ? 'urgent' : 'high',
                'data' => json_encode([
                    'detection_id' => $detection->id,
                    'video_path' => $this->filePath,
                    'frame_index' => $frameIndex,
                ]),
            ]);
        }

        return $detection;
    }

    /**
     * Save a frame screenshot to permanent storage.
     */
    private function saveScreenshot(string $framePath, int $caseId, int $frameIndex): string
    {
        $destinationPath = "detections/video/case_{$caseId}/frame_{$frameIndex}.jpg";

        $imageData = file_get_contents($framePath);
        Storage::put($destinationPath, $imageData);

        return $destinationPath;
    }

    /**
     * Clean up temporary directory.
     */
    private function cleanupTempDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $files = glob("{$dir}/*");
        foreach ($files as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }

        rmdir($dir);
    }

    /**
     * Handle a job failure.
     */
    public function failed(Throwable $exception): void
    {
        Log::error('ProcessVideoJob: Permanently failed', [
            'file_path' => $this->filePath,
            'case_id' => $this->caseId,
            'error' => $exception->getMessage(),
        ]);
    }
}
