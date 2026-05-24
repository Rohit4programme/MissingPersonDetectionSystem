<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Evidence;
use App\Models\MissingPerson;
use App\Models\TimelineEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class EvidenceController extends Controller
{
    /**
     * List evidence for a case.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'case_id' => 'required|exists:missing_persons,id',
                'type' => 'sometimes|string|in:image,video,document,audio',
                'sort_by' => 'sometimes|string|in:created_at,type',
                'sort_order' => 'sometimes|string|in:asc,desc',
                'per_page' => 'sometimes|integer|min:1|max:100',
            ]);

            $query = Evidence::with(['uploader'])
                ->where('missing_person_id', $validated['case_id']);

            if (!empty($validated['type'])) {
                $query->where('type', $validated['type']);
            }

            $sortBy = $validated['sort_by'] ?? 'created_at';
            $sortOrder = $validated['sort_order'] ?? 'desc';
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $validated['per_page'] ?? 15;
            $evidence = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $evidence->items(),
                'message' => 'Evidence retrieved successfully.',
                'meta' => [
                    'current_page' => $evidence->currentPage(),
                    'last_page' => $evidence->lastPage(),
                    'per_page' => $evidence->perPage(),
                    'total' => $evidence->total(),
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to list evidence.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve evidence.',
            ], 500);
        }
    }

    /**
     * Upload evidence file. Validate type/size, generate hash, optionally watermark images.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'case_id' => 'required|exists:missing_persons,id',
                'type' => 'required|string|in:image,video,document,audio',
                'file' => 'required|file|max:51200', // 50MB max
                'title' => 'sometimes|string|max:255',
                'description' => 'sometimes|nullable|string|max:2000',
                'is_sensitive' => 'sometimes|boolean',
            ]);

            // Additional file type validation based on evidence type
            $file = $request->file('file');
            $allowedMimes = match ($validated['type']) {
                'image' => ['jpeg', 'png', 'jpg', 'gif', 'bmp', 'webp'],
                'video' => ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
                'document' => ['pdf', 'doc', 'docx', 'txt', 'rtf'],
                'audio' => ['mp3', 'wav', 'ogg', 'flac', 'aac'],
                default => [],
            };

            if (!empty($allowedMimes) && !in_array($file->getClientOriginalExtension(), $allowedMimes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid file type for the selected evidence type.',
                    'errors' => ['file' => ["Allowed extensions for {$validated['type']}: " . implode(', ', $allowedMimes)]],
                ], 422);
            }

            DB::beginTransaction();

            // Store file
            $case = MissingPerson::find($validated['case_id']);
            $filePath = $file->store("evidence/{$case->case_number}", 'public');

            // Generate file hash for integrity verification
            $fileHash = hash_file('sha256', $file->getRealPath());

            // Watermark images (optional)
            if ($validated['type'] === 'image' && config('evidence.watermark_enabled', false)) {
                try {
                    $this->watermarkImage(Storage::disk('public')->path($filePath));
                } catch (\Exception $watermarkException) {
                    Log::warning('Failed to watermark image.', ['error' => $watermarkException->getMessage()]);
                }
            }

            $evidence = Evidence::create([
                'missing_person_id' => $validated['case_id'],
                'type' => $validated['type'],
                'title' => $validated['title'] ?? $file->getClientOriginalName(),
                'description' => $validated['description'] ?? null,
                'file_path' => $filePath,
                'file_name' => $file->getClientOriginalName(),
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'file_hash' => $fileHash,
                'is_sensitive' => $validated['is_sensitive'] ?? false,
                'uploaded_by' => $request->user()->id,
            ]);

            // Create timeline entry
            TimelineEntry::create([
                'missing_person_id' => $validated['case_id'],
                'user_id' => $request->user()->id,
                'type' => 'evidence_added',
                'description' => "Evidence \"{$evidence->title}\" ({$validated['type']}) added to case {$case->case_number}.",
                'metadata' => json_encode([
                    'evidence_id' => $evidence->id,
                    'type' => $validated['type'],
                    'file_name' => $file->getClientOriginalName(),
                ]),
            ]);

            DB::commit();

            Log::info('Evidence uploaded.', [
                'evidence_id' => $evidence->id,
                'case_id' => $validated['case_id'],
                'uploaded_by' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'data' => $evidence,
                'message' => 'Evidence uploaded successfully.',
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to upload evidence.', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload evidence.',
            ], 500);
        }
    }

    /**
     * Get evidence details.
     */
    public function show($id): JsonResponse
    {
        try {
            $evidence = Evidence::with(['missingPerson', 'uploader'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $evidence,
                'message' => 'Evidence retrieved successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Evidence not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve evidence.', ['evidence_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve evidence.',
            ], 500);
        }
    }

    /**
     * Soft delete evidence.
     */
    public function destroy($id): JsonResponse
    {
        try {
            $evidence = Evidence::findOrFail($id);

            DB::beginTransaction();

            // Create timeline entry before deletion
            TimelineEntry::create([
                'missing_person_id' => $evidence->missing_person_id,
                'user_id' => request()->user()->id,
                'type' => 'evidence_removed',
                'description' => "Evidence \"{$evidence->title}\" removed from case.",
                'metadata' => json_encode([
                    'evidence_id' => $evidence->id,
                    'title' => $evidence->title,
                    'type' => $evidence->type,
                ]),
            ]);

            $evidence->delete();

            DB::commit();

            Log::info('Evidence soft-deleted.', ['evidence_id' => $id, 'deleted_by' => request()->user()->id]);

            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'Evidence deleted successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Evidence not found.',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to delete evidence.', ['evidence_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete evidence.',
            ], 500);
        }
    }

    /**
     * Download file with audit log.
     */
    public function download($id): JsonResponse
    {
        try {
            $evidence = Evidence::findOrFail($id);

            // Verify file exists
            if (!Storage::disk('public')->exists($evidence->file_path)) {
                Log::error('Evidence file missing from storage.', ['evidence_id' => $id, 'path' => $evidence->file_path]);
                return response()->json([
                    'success' => false,
                    'message' => 'File not found on server.',
                ], 404);
            }

            // Verify file integrity
            $currentHash = hash_file('sha256', Storage::disk('public')->path($evidence->file_path));
            $integrityValid = $currentHash === $evidence->file_hash;

            if (!$integrityValid) {
                Log::warning('Evidence file integrity check failed.', [
                    'evidence_id' => $id,
                    'expected_hash' => $evidence->file_hash,
                    'actual_hash' => $currentHash,
                ]);
            }

            // Log audit trail
            Log::info('Evidence downloaded.', [
                'evidence_id' => $id,
                'case_id' => $evidence->missing_person_id,
                'downloaded_by' => request()->user()->id,
                'file_name' => $evidence->file_name,
                'integrity_valid' => $integrityValid,
            ]);

            // Return download URL (signed URL for private storage or direct URL for public)
            $downloadUrl = Storage::disk('public')->url($evidence->file_path);

            return response()->json([
                'success' => true,
                'data' => [
                    'download_url' => $downloadUrl,
                    'file_name' => $evidence->file_name,
                    'file_size' => $evidence->file_size,
                    'mime_type' => $evidence->mime_type,
                    'file_hash' => $evidence->file_hash,
                    'integrity_valid' => $integrityValid,
                ],
                'message' => 'Download link generated successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Evidence not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to download evidence.', ['evidence_id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate download link.',
            ], 500);
        }
    }

    /**
     * Watermark an image file.
     */
    private function watermarkImage(string $path): void
    {
        $imageInfo = getimagesize($path);
        if (!$imageInfo) {
            return;
        }

        $mimeType = $imageInfo['mime'];
        $image = match ($mimeType) {
            'image/jpeg' => imagecreatefromjpeg($path),
            'image/png' => imagecreatefrompng($path),
            'image/gif' => imagecreatefromgif($path),
            default => null,
        };

        if (!$image) {
            return;
        }

        $width = imagesx($image);
        $height = imagesy($image);

        // Add semi-transparent watermark text
        $text = 'MISSING PERSON DETECTION SYSTEM';
        $fontSize = max(4, (int)($width / 30));
        $textColor = imagecolorallocatealpha($image, 255, 255, 255, 60);

        // Position: bottom-right corner
        $textBox = imagettfbbox($fontSize, 0, null, $text);
        $textWidth = $textBox[2] - $textBox[0];
        $x = $width - $textWidth - 10;
        $y = $height - 20;

        imagettftext($image, $fontSize, 0, $x, $y, $textColor, null, $text);

        // Save watermarked image
        match ($mimeType) {
            'image/jpeg' => imagejpeg($image, $path, 90),
            'image/png' => imagepng($image, $path),
            'image/gif' => imagegif($image, $path),
        };

        imagedestroy($image);
    }
}
