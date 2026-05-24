<?php

namespace Database\Seeders;

use App\Models\Camera;
use App\Models\Detection;
use App\Models\MissingPerson;
use App\Models\User;
use Illuminate\Database\Seeder;

class DetectionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Creates 20 detections distributed across the 5 missing person cases
     * with varying confidence scores, sources, and verification states.
     */
    public function run(): void
    {
        $missingPersons = MissingPerson::all();
        $cameras = Camera::all();
        $officers = User::where('role', 'officer')->get();

        if ($missingPersons->isEmpty()) {
            $this->command->warn('No missing persons found. Run MissingPersonSeeder first.');
            return;
        }

        $indianLocations = [
            ['name' => 'Connaught Place, Block A, Delhi', 'lat' => 28.6320, 'lng' => 77.2180],
            ['name' => 'Karol Bagh Market, Delhi', 'lat' => 28.6510, 'lng' => 77.1900],
            ['name' => 'Chandni Chowk, Old Delhi', 'lat' => 28.6507, 'lng' => 77.2334],
            ['name' => 'Dadar Station, Mumbai', 'lat' => 19.0178, 'lng' => 72.8432],
            ['name' => 'Bandra West, Mumbai', 'lat' => 19.0596, 'lng' => 72.8295],
            ['name' => 'MG Road, Bangalore', 'lat' => 12.9758, 'lng' => 77.6068],
            ['name' => 'T. Nagar, Chennai', 'lat' => 13.0405, 'lng' => 80.2337],
            ['name' => 'Park Street, Kolkata', 'lat' => 22.5527, 'lng' => 88.3517],
            ['name' => 'Secunderabad Station, Hyderabad', 'lat' => 17.4399, 'lng' => 78.5010],
            ['name' => 'FC Road, Pune', 'lat' => 18.5308, 'lng' => 73.8475],
            ['name' => 'SG Highway, Ahmedabad', 'lat' => 23.0225, 'lng' => 72.5100],
            ['name' => 'Hawa Mahal Area, Jaipur', 'lat' => 26.9239, 'lng' => 75.8267],
            ['name' => 'Gariahat Market, Kolkata', 'lat' => 22.5170, 'lng' => 88.3680],
            ['name' => 'Nehru Place, South Delhi', 'lat' => 28.5490, 'lng' => 77.2530],
            ['name' => 'Andheri Station, Mumbai', 'lat' => 19.1197, 'lng' => 72.8464],
            ['name' => 'Lajpat Nagar Market, Delhi', 'lat' => 28.5690, 'lng' => 77.2400],
            ['name' => 'Dwarka Sector 10, Delhi', 'lat' => 28.5820, 'lng' => 77.0460],
            ['name' => 'Rajouri Garden, West Delhi', 'lat' => 28.6490, 'lng' => 77.1230],
            ['name' => 'Saket District Centre, Delhi', 'lat' => 28.5230, 'lng' => 77.2070],
            ['name' => 'IGI Airport Terminal 3, Delhi', 'lat' => 28.5560, 'lng' => 77.1000],
        ];

        $detections = [
            // Case 1: Priya Sharma (critical, missing) - 5 detections
            ['person_index' => 0, 'source' => 'cctv', 'confidence' => 0.92, 'is_verified' => true, 'days_ago' => 12, 'loc_index' => 0],
            ['person_index' => 0, 'source' => 'public_upload', 'confidence' => 0.78, 'is_verified' => true, 'days_ago' => 10, 'loc_index' => 13],
            ['person_index' => 0, 'source' => 'cctv', 'confidence' => 0.85, 'is_verified' => false, 'days_ago' => 8, 'loc_index' => 1],
            ['person_index' => 0, 'source' => 'officer_upload', 'confidence' => 0.55, 'is_verified' => false, 'days_ago' => 6, 'loc_index' => 18],
            ['person_index' => 0, 'source' => 'cctv', 'confidence' => 0.98, 'is_verified' => true, 'days_ago' => 3, 'loc_index' => 16],

            // Case 2: Rahul Verma (high, missing) - 4 detections
            ['person_index' => 1, 'source' => 'cctv', 'confidence' => 0.88, 'is_verified' => true, 'days_ago' => 14, 'loc_index' => 3],
            ['person_index' => 1, 'source' => 'public_upload', 'confidence' => 0.72, 'is_verified' => false, 'days_ago' => 11, 'loc_index' => 4],
            ['person_index' => 1, 'source' => 'cctv', 'confidence' => 0.94, 'is_verified' => true, 'days_ago' => 7, 'loc_index' => 14],
            ['person_index' => 1, 'source' => 'cctv', 'confidence' => 0.61, 'is_verified' => false, 'days_ago' => 4, 'loc_index' => 15],

            // Case 3: Ananya Patel (high, under_investigation) - 4 detections
            ['person_index' => 2, 'source' => 'cctv', 'confidence' => 0.76, 'is_verified' => true, 'days_ago' => 15, 'loc_index' => 10],
            ['person_index' => 2, 'source' => 'cctv', 'confidence' => 0.82, 'is_verified' => true, 'days_ago' => 12, 'loc_index' => 5],
            ['person_index' => 2, 'source' => 'public_upload', 'confidence' => 0.91, 'is_verified' => false, 'days_ago' => 9, 'loc_index' => 6],
            ['person_index' => 2, 'source' => 'officer_upload', 'confidence' => 0.69, 'is_verified' => false, 'days_ago' => 5, 'loc_index' => 9],

            // Case 4: Vikram Singh (medium, detected) - 4 detections
            ['person_index' => 3, 'source' => 'cctv', 'confidence' => 0.89, 'is_verified' => true, 'days_ago' => 20, 'loc_index' => 11],
            ['person_index' => 3, 'source' => 'cctv', 'confidence' => 0.95, 'is_verified' => true, 'days_ago' => 16, 'loc_index' => 12],
            ['person_index' => 3, 'source' => 'public_upload', 'confidence' => 0.74, 'is_verified' => false, 'days_ago' => 13, 'loc_index' => 8],
            ['person_index' => 3, 'source' => 'cctv', 'confidence' => 0.67, 'is_verified' => false, 'days_ago' => 10, 'loc_index' => 7],

            // Case 5: Meera Devi (low, found_safe) - 3 detections
            ['person_index' => 4, 'source' => 'cctv', 'confidence' => 0.86, 'is_verified' => true, 'days_ago' => 22, 'loc_index' => 7],
            ['person_index' => 4, 'source' => 'public_upload', 'confidence' => 0.73, 'is_verified' => true, 'days_ago' => 18, 'loc_index' => 2],
            ['person_index' => 4, 'source' => 'cctv', 'confidence' => 0.58, 'is_verified' => false, 'days_ago' => 15, 'loc_index' => 19],
        ];

        foreach ($detections as $index => $detection) {
            $person = $missingPersons[$detection['person_index']];
            $location = $indianLocations[$detection['loc_index']];

            $detectedAt = now()->subDays($detection['days_ago'])
                ->addHours(rand(6, 22))
                ->addMinutes(rand(0, 59));

            $cameraId = null;
            if ($detection['source'] === 'cctv' && $cameras->isNotEmpty()) {
                $cameraId = $cameras->random()->id;
            }

            Detection::create([
                'person_id' => $person->id,
                'camera_id' => $cameraId,
                'confidence_score' => $detection['confidence'],
                'screenshot_path' => 'detections/screenshots/detection_' . ($index + 1) . '.jpg',
                'bounding_box' => json_encode([
                    'x' => rand(100, 300),
                    'y' => rand(50, 200),
                    'width' => rand(100, 200),
                    'height' => rand(100, 200),
                ]),
                'frame_timestamp' => $detectedAt,
                'latitude' => $location['lat'] + fake()->randomFloat(4, -0.005, 0.005),
                'longitude' => $location['lng'] + fake()->randomFloat(4, -0.005, 0.005),
                'location_name' => $location['name'],
                'source' => $detection['source'],
                'is_verified' => $detection['is_verified'],
                'verified_by' => $detection['is_verified'] && $officers->isNotEmpty()
                    ? $officers->random()->id
                    : null,
                'ai_metadata' => json_encode([
                    'model' => 'facenet_v2',
                    'processing_time_ms' => rand(50, 500),
                    'face_quality' => fake()->randomFloat(2, 0.4, 1.0),
                    'camera_id' => $cameraId,
                ]),
                'created_at' => $detectedAt,
                'updated_at' => $detectedAt,
            ]);
        }

        $this->command->info('Created 20 detections across 5 cases successfully.');
    }
}
