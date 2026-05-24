<?php

namespace Database\Seeders;

use App\Models\Camera;
use App\Models\Jurisdiction;
use Illuminate\Database\Seeder;

class CameraSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $jurisdictions = Jurisdiction::all();

        if ($jurisdictions->isEmpty()) {
            $this->command->warn('No jurisdictions found. Run JurisdictionSeeder first.');
            return;
        }

        $cameras = [
            [
                'name' => 'Central Station Main Gate',
                'code' => 'CAM-CEN-001',
                'type' => 'ip',
                'location' => 'Central Railway Station, Main Entrance',
                'latitude' => 28.6310,
                'longitude' => 77.2210,
                'rtsp_url' => 'rtsp://camera1.mpds.local/stream',
                'jurisdiction_code' => 'CEN',
            ],
            [
                'name' => 'Connaught Place Circle',
                'code' => 'CAM-CEN-002',
                'type' => 'rtsp',
                'location' => 'Connaught Place, Block A Circle',
                'latitude' => 28.6330,
                'longitude' => 77.2190,
                'rtsp_url' => 'rtsp://camera2.mpds.local/stream',
                'jurisdiction_code' => 'CEN',
            ],
            [
                'name' => 'North Market Junction',
                'code' => 'CAM-NOR-001',
                'type' => 'ip',
                'location' => 'North District Market, Main Road Junction',
                'latitude' => 28.6750,
                'longitude' => 77.2180,
                'rtsp_url' => 'rtsp://camera3.mpds.local/stream',
                'jurisdiction_code' => 'NOR',
            ],
            [
                'name' => 'University Gate Camera',
                'code' => 'CAM-NOR-002',
                'type' => 'rtsp',
                'location' => 'University Campus, North Gate',
                'latitude' => 28.6900,
                'longitude' => 77.2350,
                'rtsp_url' => 'rtsp://camera4.mpds.local/stream',
                'jurisdiction_code' => 'NOR',
            ],
            [
                'name' => 'South Bus Terminal',
                'code' => 'CAM-SOU-001',
                'type' => 'dvr',
                'location' => 'Interstate Bus Terminal, Platform Area',
                'latitude' => 28.5500,
                'longitude' => 77.2250,
                'rtsp_url' => 'rtsp://camera5.mpds.local/stream',
                'jurisdiction_code' => 'SOU',
            ],
            [
                'name' => 'South Hospital Entrance',
                'code' => 'CAM-SOU-002',
                'type' => 'ip',
                'location' => 'Government Hospital, Main Entrance',
                'latitude' => 28.5650,
                'longitude' => 77.2300,
                'rtsp_url' => 'rtsp://camera6.mpds.local/stream',
                'jurisdiction_code' => 'SOU',
            ],
            [
                'name' => 'East Flyover Camera',
                'code' => 'CAM-EAS-001',
                'type' => 'rtsp',
                'location' => 'Eastern Expressway Flyover, Overhead',
                'latitude' => 28.6180,
                'longitude' => 77.2800,
                'rtsp_url' => 'rtsp://camera7.mpds.local/stream',
                'jurisdiction_code' => 'EAS',
            ],
            [
                'name' => 'East Industrial Area',
                'code' => 'CAM-EAS-002',
                'type' => 'dvr',
                'location' => 'Industrial Area Gate, Security Post',
                'latitude' => 28.6100,
                'longitude' => 77.2950,
                'rtsp_url' => 'rtsp://camera8.mpds.local/stream',
                'jurisdiction_code' => 'EAS',
            ],
            [
                'name' => 'West Mall Entrance',
                'code' => 'CAM-WES-001',
                'type' => 'ip',
                'location' => 'City Mall, Main Entrance',
                'latitude' => 28.6250,
                'longitude' => 77.1350,
                'rtsp_url' => 'rtsp://camera9.mpds.local/stream',
                'jurisdiction_code' => 'WES',
            ],
            [
                'name' => 'West Park Gate',
                'code' => 'CAM-WES-002',
                'type' => 'rtsp',
                'location' => 'Municipal Park, South Gate',
                'latitude' => 28.6150,
                'longitude' => 77.1500,
                'rtsp_url' => 'rtsp://camera10.mpds.local/stream',
                'jurisdiction_code' => 'WES',
            ],
        ];

        foreach ($cameras as $cameraData) {
            $jurisdiction = $jurisdictions->firstWhere('code', $cameraData['jurisdiction_code']);

            Camera::create([
                'name' => $cameraData['name'],
                'code' => $cameraData['code'],
                'type' => $cameraData['type'],
                'location' => $cameraData['location'],
                'latitude' => $cameraData['latitude'],
                'longitude' => $cameraData['longitude'],
                'rtsp_url' => $cameraData['rtsp_url'],
                'jurisdiction_id' => $jurisdiction?->id,
                'status' => 'active',
                'is_active' => true,
                'resolution' => '1080p',
                'fps' => 25,
                'metadata' => json_encode([
                    'manufacturer' => fake()->randomElement(['Hikvision', 'Dahua', 'Axis', 'Bosch']),
                    'model' => 'DS-2CD-' . strtoupper(fake()->bothify('????-####')),
                    'installed_date' => fake()->dateTimeBetween('-2 years', '-1 month')->format('Y-m-d'),
                ]),
            ]);
        }

        $this->command->info('Cameras seeded successfully.');
    }
}
