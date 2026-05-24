<?php

namespace Database\Seeders;

use App\Models\MissingPerson;
use App\Models\Sighting;
use App\Models\User;
use Illuminate\Database\Seeder;

class SightingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Creates 15 sightings with various statuses:
     * 6 pending, 5 verified, 3 rejected, 1 spam
     * Distributed across Indian cities over the last 14 days.
     */
    public function run(): void
    {
        $missingPersons = MissingPerson::all();
        $officers = User::where('role', 'officer')->get();

        if ($missingPersons->isEmpty()) {
            $this->command->warn('No missing persons found. Run MissingPersonSeeder first.');
            return;
        }

        $locations = [
            ['name' => 'Old Delhi Railway Station, Platform 5', 'lat' => 28.6610, 'lng' => 77.2330],
            ['name' => 'Sadar Bazaar, Central Delhi', 'lat' => 28.6540, 'lng' => 77.2140],
            ['name' => 'Yamuna Bank Metro Station, Delhi', 'lat' => 28.6240, 'lng' => 77.2760],
            ['name' => 'Chhatrapati Shivaji Terminus, Mumbai', 'lat' => 18.9398, 'lng' => 72.8355],
            ['name' => 'AIIMS Hospital, South Delhi', 'lat' => 28.5670, 'lng' => 77.2100],
            ['name' => 'Red Fort Area, Old Delhi', 'lat' => 28.6560, 'lng' => 77.2410],
            ['name' => 'Nizamuddin Railway Station, Delhi', 'lat' => 28.5890, 'lng' => 77.2500],
            ['name' => 'Dhaula Kuan Bus Stop, Delhi', 'lat' => 28.5920, 'lng' => 77.1680],
            ['name' => 'GTB Nagar Metro Station, Delhi', 'lat' => 28.6980, 'lng' => 77.2070],
            ['name' => 'Laxmi Nagar Market, East Delhi', 'lat' => 28.6340, 'lng' => 77.2810],
            ['name' => 'Kalupur Market, Ahmedabad', 'lat' => 23.0318, 'lng' => 72.6047],
            ['name' => 'Johari Bazaar, Jaipur', 'lat' => 26.9228, 'lng' => 75.8267],
            ['name' => 'Howrah Station, Kolkata', 'lat' => 22.5849, 'lng' => 88.3420],
            ['name' => 'Bandra West, Mumbai', 'lat' => 19.0596, 'lng' => 72.8295],
            ['name' => 'Rohini Sector 7, North Delhi', 'lat' => 28.7180, 'lng' => 77.1170],
        ];

        $reporters = [
            'Ramesh Kumar', 'Sunita Agarwal', 'Pradeep Mishra', 'Neha Gupta',
            'Arun Joshi', 'Kavita Sharma', 'Deepak Verma', 'Pooja Singh',
            'Rajesh Tiwari', 'Anita Devi',
        ];

        $descriptions = [
            'I saw someone matching this description near the area. They appeared to be alone and seemed disoriented.',
            'Spotted this person at the location. They were sitting on a bench and looked like they had been there for a while.',
            'I was at the market when I noticed someone who looked very similar to the missing person poster.',
            'This person was seen asking for directions. They seemed confused about where they were going.',
            'I saw them near the bus stop. They got on a bus heading towards the northern part of the city.',
            'Person matching the description was seen at a tea stall near the station.',
            'Spotted this individual walking near the park. They were carrying a small bag.',
            'I think I saw this person at the hospital. They appeared to be looking for someone.',
            'Matched the description at the grocery store. Was buying basic necessities.',
            'Saw this person near the temple area. They were sitting alone for a long time.',
            'This person was at a dhaba on the highway. They paid in cash and left on foot.',
            'I saw them getting into a shared auto-rickshaw near the main road intersection.',
        ];

        $sightings = [
            // 6 pending sightings
            ['person_index' => 0, 'status' => 'pending', 'is_anonymous' => false, 'days_ago' => 2, 'loc_index' => 0, 'reporter_index' => 0, 'ai_score' => null],
            ['person_index' => 1, 'status' => 'pending', 'is_anonymous' => true, 'days_ago' => 3, 'loc_index' => 4, 'reporter_index' => null, 'ai_score' => null],
            ['person_index' => 2, 'status' => 'pending', 'is_anonymous' => false, 'days_ago' => 1, 'loc_index' => 10, 'reporter_index' => 2, 'ai_score' => null],
            ['person_index' => 0, 'status' => 'pending', 'is_anonymous' => false, 'days_ago' => 5, 'loc_index' => 8, 'reporter_index' => 4, 'ai_score' => null],
            ['person_index' => 3, 'status' => 'pending', 'is_anonymous' => true, 'days_ago' => 4, 'loc_index' => 11, 'reporter_index' => null, 'ai_score' => null],
            ['person_index' => 1, 'status' => 'pending', 'is_anonymous' => false, 'days_ago' => 1, 'loc_index' => 14, 'reporter_index' => 6, 'ai_score' => null],

            // 5 verified sightings
            ['person_index' => 0, 'status' => 'verified', 'is_anonymous' => false, 'days_ago' => 10, 'loc_index' => 5, 'reporter_index' => 1, 'ai_score' => 0.87],
            ['person_index' => 1, 'status' => 'verified', 'is_anonymous' => false, 'days_ago' => 9, 'loc_index' => 6, 'reporter_index' => 3, 'ai_score' => 0.91],
            ['person_index' => 2, 'status' => 'verified', 'is_anonymous' => false, 'days_ago' => 7, 'loc_index' => 3, 'reporter_index' => 5, 'ai_score' => 0.78],
            ['person_index' => 3, 'status' => 'verified', 'is_anonymous' => false, 'days_ago' => 12, 'loc_index' => 11, 'reporter_index' => 7, 'ai_score' => 0.95],
            ['person_index' => 4, 'status' => 'verified', 'is_anonymous' => false, 'days_ago' => 14, 'loc_index' => 12, 'reporter_index' => 9, 'ai_score' => 0.83],

            // 3 rejected sightings
            ['person_index' => 0, 'status' => 'rejected', 'is_anonymous' => false, 'days_ago' => 8, 'loc_index' => 1, 'reporter_index' => 8, 'ai_score' => 0.32],
            ['person_index' => 2, 'status' => 'rejected', 'is_anonymous' => true, 'days_ago' => 6, 'loc_index' => 7, 'reporter_index' => null, 'ai_score' => 0.41],
            ['person_index' => 3, 'status' => 'rejected', 'is_anonymous' => false, 'days_ago' => 11, 'loc_index' => 9, 'reporter_index' => 4, 'ai_score' => 0.28],

            // 1 spam sighting
            ['person_index' => 1, 'status' => 'spam', 'is_anonymous' => true, 'days_ago' => 13, 'loc_index' => 2, 'reporter_index' => null, 'ai_score' => null],
        ];

        foreach ($sightings as $index => $sighting) {
            $person = $missingPersons[$sighting['person_index']];
            $location = $locations[$sighting['loc_index']];

            $reporterName = null;
            $reporterPhone = null;
            $reporterId = null;

            if (!$sighting['is_anonymous'] && $sighting['reporter_index'] !== null) {
                $reporterName = $reporters[$sighting['reporter_index']];
                $reporterPhone = '+91-' . fake()->numerify('##########');
                // Try to find a public user, otherwise leave as null
                $publicUser = User::where('role', 'public')->first();
                $reporterId = $publicUser?->id;
            }

            $sightedAt = now()->subDays($sighting['days_ago'])
                ->addHours(rand(6, 22))
                ->addMinutes(rand(0, 59));

            $verifiedBy = null;
            if (in_array($sighting['status'], ['verified', 'rejected']) && $officers->isNotEmpty()) {
                $verifiedBy = $officers->random()->id;
            }

            Sighting::create([
                'person_id' => $person->id,
                'reporter_id' => $reporterId,
                'reporter_name' => $reporterName,
                'reporter_phone' => $reporterPhone,
                'reporter_email' => null,
                'is_anonymous' => $sighting['is_anonymous'],
                'latitude' => $location['lat'] + fake()->randomFloat(4, -0.005, 0.005),
                'longitude' => $location['lng'] + fake()->randomFloat(4, -0.005, 0.005),
                'location_name' => $location['name'],
                'image_path' => $sighting['status'] !== 'spam' ? 'sightings/sighting_' . ($index + 1) . '.jpg' : null,
                'video_path' => null,
                'notes' => $descriptions[$index % count($descriptions)],
                'device_info' => json_encode([
                    'platform' => fake()->randomElement(['android', 'ios', 'web']),
                    'browser' => fake()->randomElement(['Chrome', 'Safari', 'Firefox']),
                ]),
                'status' => $sighting['status'],
                'verified_by' => $verifiedBy,
                'ai_similarity_score' => $sighting['ai_score'],
                'created_at' => $sightedAt,
                'updated_at' => $sightedAt,
            ]);
        }

        $this->command->info('Created 15 sightings (6 pending, 5 verified, 3 rejected, 1 spam) successfully.');
    }
}
