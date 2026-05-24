<?php

namespace Database\Seeders;

use App\Models\Jurisdiction;
use Illuminate\Database\Seeder;

class JurisdictionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $jurisdictions = [
            [
                'name' => 'Central District',
                'code' => 'CEN',
                'description' => 'Central business and administrative district',
                'boundary' => json_encode([
                    [28.6200, 77.2100],
                    [28.6200, 77.2400],
                    [28.6400, 77.2400],
                    [28.6400, 77.2100],
                    [28.6200, 77.2100],
                ]),
                'center_latitude' => 28.6300,
                'center_longitude' => 77.2250,
                'is_active' => true,
            ],
            [
                'name' => 'North District',
                'code' => 'NOR',
                'description' => 'Northern residential and university district',
                'boundary' => json_encode([
                    [28.6600, 77.2000],
                    [28.6600, 77.2400],
                    [28.7000, 77.2400],
                    [28.7000, 77.2000],
                    [28.6600, 77.2000],
                ]),
                'center_latitude' => 28.6800,
                'center_longitude' => 77.2200,
                'is_active' => true,
            ],
            [
                'name' => 'South District',
                'code' => 'SOU',
                'description' => 'Southern commercial and residential district',
                'boundary' => json_encode([
                    [28.5400, 77.2000],
                    [28.5400, 77.2400],
                    [28.5800, 77.2400],
                    [28.5800, 77.2000],
                    [28.5400, 77.2000],
                ]),
                'center_latitude' => 28.5600,
                'center_longitude' => 77.2200,
                'is_active' => true,
            ],
            [
                'name' => 'East District',
                'code' => 'EAS',
                'description' => 'Eastern industrial and transport hub',
                'boundary' => json_encode([
                    [28.6000, 77.2600],
                    [28.6000, 77.3100],
                    [28.6400, 77.3100],
                    [28.6400, 77.2600],
                    [28.6000, 77.2600],
                ]),
                'center_latitude' => 28.6200,
                'center_longitude' => 77.2850,
                'is_active' => true,
            ],
            [
                'name' => 'West District',
                'code' => 'WES',
                'description' => 'Western suburban and market district',
                'boundary' => json_encode([
                    [28.6000, 77.1200],
                    [28.6000, 77.1700],
                    [28.6400, 77.1700],
                    [28.6400, 77.1200],
                    [28.6000, 77.1200],
                ]),
                'center_latitude' => 28.6200,
                'center_longitude' => 77.1450,
                'is_active' => true,
            ],
        ];

        foreach ($jurisdictions as $data) {
            Jurisdiction::create($data);
        }

        $this->command->info('Jurisdictions seeded successfully.');
    }
}
