<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * This seeder creates a comprehensive dataset for the Missing Person Detection System.
     * Run with: php artisan migrate:fresh --seed
     */
    public function run(): void
    {
        $this->command->info('Seeding Missing Person Detection System...');
        $this->command->newLine();

        // Seed in dependency order
        $this->call([
            UserSeeder::class,
            JurisdictionSeeder::class,
            CameraSeeder::class,
            MissingPersonSeeder::class,
            DetectionSeeder::class,
            SightingSeeder::class,
            AlertSeeder::class,
        ]);

        $this->command->newLine();
        $this->command->info('All seeders completed successfully.');
    }
}
