<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Super Admin
        User::create([
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'email' => 'admin@mpds.gov',
            'password' => Hash::make('password'),
            'phone' => '+91-9876543210',
            'role' => 'super_admin',
            'badge_number' => 'SA-0001',
            'department' => 'System Administration',
            'jurisdiction_id' => null,
            'is_active' => true,
            'email_verified_at' => now(),
            'notify_email' => true,
            'notify_sms' => true,
            'notify_push' => true,
        ]);

        // Admin
        User::create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin2@mpds.gov',
            'password' => Hash::make('password'),
            'phone' => '+91-9876543211',
            'role' => 'admin',
            'badge_number' => 'ADM-0002',
            'department' => 'Administration',
            'jurisdiction_id' => null,
            'is_active' => true,
            'email_verified_at' => now(),
            'notify_email' => true,
            'notify_sms' => true,
            'notify_push' => true,
        ]);

        // Officer 1
        User::create([
            'first_name' => 'Rajesh',
            'last_name' => 'Kumar',
            'email' => 'officer1@mpds.gov',
            'password' => Hash::make('password'),
            'phone' => '+91-9876543212',
            'role' => 'officer',
            'badge_number' => 'MPD-001',
            'department' => 'Missing Persons Unit',
            'jurisdiction_id' => null,
            'is_active' => true,
            'email_verified_at' => now(),
            'notify_email' => true,
            'notify_sms' => true,
            'notify_push' => true,
        ]);

        // Officer 2
        User::create([
            'first_name' => 'Priya',
            'last_name' => 'Sharma',
            'email' => 'officer2@mpds.gov',
            'password' => Hash::make('password'),
            'phone' => '+91-9876543213',
            'role' => 'officer',
            'badge_number' => 'MPD-002',
            'department' => 'Missing Persons Unit',
            'jurisdiction_id' => null,
            'is_active' => true,
            'email_verified_at' => now(),
            'notify_email' => true,
            'notify_sms' => true,
            'notify_push' => true,
        ]);

        // Officer 3
        User::create([
            'first_name' => 'Amit',
            'last_name' => 'Singh',
            'email' => 'officer3@mpds.gov',
            'password' => Hash::make('password'),
            'phone' => '+91-9876543214',
            'role' => 'officer',
            'badge_number' => 'MPD-003',
            'department' => 'Missing Persons Unit',
            'jurisdiction_id' => null,
            'is_active' => true,
            'email_verified_at' => now(),
            'notify_email' => true,
            'notify_sms' => true,
            'notify_push' => true,
        ]);

        // Public User
        User::create([
            'first_name' => 'Public',
            'last_name' => 'User',
            'email' => 'user@mpds.gov',
            'password' => Hash::make('password'),
            'phone' => '+91-9876543215',
            'role' => 'public',
            'badge_number' => null,
            'department' => null,
            'jurisdiction_id' => null,
            'is_active' => true,
            'email_verified_at' => now(),
            'notify_email' => true,
            'notify_sms' => false,
            'notify_push' => true,
        ]);

        $this->command->info('Users seeded successfully.');
    }
}
