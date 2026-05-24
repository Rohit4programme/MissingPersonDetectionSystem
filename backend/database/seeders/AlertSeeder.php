<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\Detection;
use App\Models\MissingPerson;
use App\Models\User;
use Illuminate\Database\Seeder;

class AlertSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Creates 30 alerts across various types and channels:
     * - Types: face_match, sighting, cctv_detection, high_confidence
     * - Channels: sms, email, push, dashboard, whatsapp
     * - 15 read, 15 unread
     * - Distributed over the last 7 days
     */
    public function run(): void
    {
        $detections = Detection::all();
        $persons = MissingPerson::all();
        $officers = User::where('role', 'officer')->get();
        $adminUsers = User::whereIn('role', ['admin', 'super_admin'])->get();

        if ($persons->isEmpty()) {
            $this->command->warn('No missing persons found. Run MissingPersonSeeder first.');
            return;
        }

        $alertTemplates = [
            // Face match alerts
            [
                'alert_type' => 'face_match',
                'title_template' => 'Face Match Detected: {person_name}',
                'message_template' => 'A potential match for {person_name} ({case_number}) was detected at {location} with {confidence}% confidence. Please verify immediately.',
                'channel' => 'dashboard',
                'is_read' => false,
            ],
            [
                'alert_type' => 'face_match',
                'title_template' => 'URGENT: High Confidence Match - {person_name}',
                'message_template' => '{person_name} was detected at {location} with {confidence}% confidence via face recognition. Case: {case_number}. Immediate action required.',
                'channel' => 'sms',
                'is_read' => false,
            ],
            [
                'alert_type' => 'face_match',
                'title_template' => 'CCTV Alert: {person_name} spotted',
                'message_template' => 'CCTV camera at {location} captured a potential match for {person_name}. Confidence: {confidence}%. Case: {case_number}.',
                'channel' => 'push',
                'is_read' => true,
            ],
            // Sighting alerts
            [
                'alert_type' => 'sighting',
                'title_template' => 'New Sighting Report: {person_name}',
                'message_template' => 'A new sighting has been reported for {person_name} ({case_number}) at {location}. Please review and verify.',
                'channel' => 'dashboard',
                'is_read' => false,
            ],
            [
                'alert_type' => 'sighting',
                'title_template' => 'Public Sighting: {person_name}',
                'message_template' => 'A member of the public reported seeing {person_name} near {location}. Case: {case_number}. AI similarity analysis pending.',
                'channel' => 'email',
                'is_read' => true,
            ],
            [
                'alert_type' => 'sighting',
                'title_template' => 'WhatsApp Alert: Sighting of {person_name}',
                'message_template' => 'Sighting alert via WhatsApp campaign: {person_name} possibly seen at {location}. Confidence score: {confidence}%.',
                'channel' => 'whatsapp',
                'is_read' => false,
            ],
            // CCTV detection alerts
            [
                'alert_type' => 'cctv_detection',
                'title_template' => 'CCTV Detection: {person_name} at {location}',
                'message_template' => 'Automated CCTV system detected a person matching {person_name} ({case_number}) at {location}. Confidence: {confidence}%. Detection ID: #{detection_id}.',
                'channel' => 'dashboard',
                'is_read' => true,
            ],
            [
                'alert_type' => 'cctv_detection',
                'title_template' => 'CCTV Alert: {person_name} Detection #{detection_id}',
                'message_template' => 'CCTV detection at {location} matched {person_name} with {confidence}% confidence. Case: {case_number}. View detection details in the dashboard.',
                'channel' => 'push',
                'is_read' => false,
            ],
            [
                'alert_type' => 'cctv_detection',
                'title_template' => 'Camera Detection: {person_name}',
                'message_template' => 'Camera at {location} flagged a match for {person_name} ({case_number}). Confidence: {confidence}%. Please check CCTV footage.',
                'channel' => 'email',
                'is_read' => true,
            ],
            // High confidence alerts
            [
                'alert_type' => 'high_confidence',
                'title_template' => 'HIGH CONFIDENCE: {person_name} detected',
                'message_template' => 'HIGH CONFIDENCE ALERT ({confidence}%): {person_name} ({case_number}) has been detected at {location}. Dispatch verification team immediately.',
                'channel' => 'sms',
                'is_read' => false,
            ],
            [
                'alert_type' => 'high_confidence',
                'title_template' => 'Critical Match: {person_name} - {confidence}% Confidence',
                'message_template' => 'Critical high-confidence match for {person_name} at {location}. Confidence score: {confidence}%. Case: {case_number}. All officers notified.',
                'channel' => 'whatsapp',
                'is_read' => false,
            ],
            [
                'alert_type' => 'high_confidence',
                'title_template' => 'Verified Detection: {person_name} at {location}',
                'message_template' => 'A verified high-confidence detection of {person_name} ({case_number}) at {location}. Confidence: {confidence}%. Case status may need updating.',
                'channel' => 'dashboard',
                'is_read' => true,
            ],
        ];

        $alertCount = 0;
        $readCount = 0;
        $unreadCount = 0;
        $targetRead = 15;
        $targetUnread = 15;
        $templateIndex = 0;

        // First pass: create alerts ensuring we hit the read/unread targets
        while ($alertCount < 30) {
            $template = $alertTemplates[$templateIndex % count($alertTemplates)];
            $templateIndex++;

            $detection = $detections->isNotEmpty() ? $detections->random() : null;
            $person = $detection ? $detection->missingPerson : $persons->random();

            // Determine the recipient
            $recipientId = match ($template['alert_type']) {
                'face_match', 'high_confidence' => $person->assigned_officer_id ?? ($officers->isNotEmpty() ? $officers->random()->id : null),
                'sighting' => $officers->isNotEmpty() ? $officers->random()->id : null,
                'cctv_detection' => $adminUsers->isNotEmpty() ? $adminUsers->random()->id : ($officers->isNotEmpty() ? $officers->random()->id : null),
                default => null,
            };

            // Determine read status to maintain balance
            $isRead = false;
            if ($unreadCount >= $targetUnread) {
                $isRead = true;
            } elseif ($readCount >= $targetRead) {
                $isRead = false;
            } else {
                // Alternate based on template or use template default
                $isRead = $template['is_read'];
                if ($isRead && $readCount >= $targetRead) {
                    $isRead = false;
                }
                if (!$isRead && $unreadCount >= $targetUnread) {
                    $isRead = true;
                }
            }

            if ($isRead) {
                $readCount++;
            } else {
                $unreadCount++;
            }

            $confidencePercent = $detection ? round($detection->confidence_score * 100, 1) : rand(55, 98);
            $locationName = $detection?->location_name ?? $persons->random()->last_seen_location;

            $createdAt = now()->subDays(rand(0, 6))
                ->subHours(rand(0, 23))
                ->subMinutes(rand(0, 59));

            $sentAt = $createdAt->copy()->addSeconds(rand(1, 30));
            $readAt = $isRead ? $sentAt->copy()->addMinutes(rand(5, 720)) : null;

            $title = str_replace(
                ['{person_name}', '{case_number}', '{location}', '{confidence}', '{detection_id}'],
                [
                    $person->full_name,
                    $person->case_number,
                    $locationName,
                    $confidencePercent,
                    $detection?->id ?? 'N/A',
                ],
                $template['title_template']
            );

            $message = str_replace(
                ['{person_name}', '{case_number}', '{location}', '{confidence}', '{detection_id}'],
                [
                    $person->full_name,
                    $person->case_number,
                    $locationName,
                    $confidencePercent,
                    $detection?->id ?? 'N/A',
                ],
                $template['message_template']
            );

            Alert::create([
                'detection_id' => $detection?->id,
                'person_id' => $person->id,
                'alert_type' => $template['alert_type'],
                'channel' => $template['channel'],
                'recipient_id' => $recipientId,
                'message' => $message,
                'is_read' => $isRead,
                'sent_at' => $sentAt,
                'read_at' => $readAt,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            $alertCount++;
        }

        $this->command->info("Created 30 alerts ({$readCount} read, {$unreadCount} unread) across all types and channels.");
    }
}
