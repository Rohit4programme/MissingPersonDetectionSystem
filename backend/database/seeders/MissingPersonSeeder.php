<?php

namespace Database\Seeders;

use App\Models\MissingPerson;
use App\Models\User;
use Illuminate\Database\Seeder;

class MissingPersonSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Creates 5 missing person cases with realistic Indian data
     * distributed across various statuses and priority levels.
     */
    public function run(): void
    {
        $admin = User::where('role', 'admin')->first();
        $officers = User::where('role', 'officer')->get();

        if (!$admin) {
            $this->command->warn('No admin user found. Run UserSeeder first.');
            return;
        }

        $cases = [
            [
                'case_number' => 'MP-2024-00001',
                'full_name' => 'Priya Sharma',
                'age' => 14,
                'gender' => 'female',
                'height' => 155.00,
                'weight' => 42.00,
                'last_seen_location' => 'Connaught Place, Block A, Central District, New Delhi',
                'last_seen_lat' => 28.6315,
                'last_seen_lng' => 77.2167,
                'last_seen_date' => '2026-05-10',
                'physical_description' => 'Fair complexion, slim build, black hair shoulder-length, brown eyes. Has a small mole on her left cheek. Wears spectacles with thin metal frames.',
                'medical_conditions' => 'Asthma - carries a blue inhaler',
                'clothing_description' => 'Wearing a pink salwar kameez with white dupatta, carrying a small blue backpack with school books. White canvas shoes.',
                'guardian_name' => 'Rajesh Sharma',
                'guardian_phone' => '+91-9812345678',
                'contact_numbers' => json_encode(['+91-9812345678', '+91-9812345679']),
                'aadhaar_number' => '1234-5678-9012',
                'passport_number' => null,
                'photo' => 'missing_persons/priya_sharma_001.jpg',
                'additional_photos' => json_encode(['missing_persons/priya_sharma_002.jpg', 'missing_persons/priya_sharma_003.jpg']),
                'fir_number' => 'FIR-2341/2026',
                'police_station' => 'Connaught Place Police Station',
                'status' => 'missing',
                'priority_level' => 'critical',
                'risk_score' => 92.50,
                'assigned_officer_id' => $officers->first()?->id,
                'created_by' => $admin->id,
                'notes' => 'Minor girl missing from Connaught Place area. Last seen leaving her tuition class at approximately 4:30 PM. Her mobile phone is switched off. Family is extremely distressed. CCTV footage from Block A shows her walking towards the metro station. This is a high-priority child safety case requiring immediate action.',
            ],
            [
                'case_number' => 'MP-2024-00002',
                'full_name' => 'Rahul Verma',
                'age' => 8,
                'gender' => 'male',
                'height' => 122.00,
                'weight' => 24.00,
                'last_seen_location' => 'Platform 3, Chhatrapati Shivaji Maharaj Terminus, Mumbai',
                'last_seen_lat' => 18.9398,
                'last_seen_lng' => 72.8355,
                'last_seen_date' => '2026-05-15',
                'physical_description' => 'Wheatish complexion, thin build, short black hair, dark brown eyes. Has a small scar on his forehead above the right eyebrow from a fall. Slightly cross-eyed.',
                'medical_conditions' => null,
                'clothing_description' => 'Blue t-shirt with cartoon print, khaki shorts, red rubber chappals. Was carrying a small plastic bag with snacks.',
                'guardian_name' => 'Suresh Verma',
                'guardian_phone' => '+91-9823456789',
                'contact_numbers' => json_encode(['+91-9823456789', '+91-9823456780']),
                'aadhaar_number' => '2345-6789-0123',
                'passport_number' => null,
                'photo' => 'missing_persons/rahul_verma_001.jpg',
                'additional_photos' => json_encode(['missing_persons/rahul_verma_002.jpg']),
                'fir_number' => 'FIR-3456/2026',
                'police_station' => 'CST Railway Police Station',
                'status' => 'missing',
                'priority_level' => 'high',
                'risk_score' => 88.00,
                'assigned_officer_id' => $officers->skip(1)->first()?->id ?? $officers->first()?->id,
                'created_by' => $admin->id,
                'notes' => 'Young boy separated from family at Mumbai CST railway station during rush hour. Family was boarding a train to Pune. The child was last seen on Platform 3 at approximately 6:15 PM. Railway police have been alerted across all platforms. GRP and RPF conducting joint search. Missing since 2 days.',
            ],
            [
                'case_number' => 'MP-2024-00003',
                'full_name' => 'Ananya Patel',
                'age' => 22,
                'gender' => 'female',
                'height' => 163.00,
                'weight' => 55.00,
                'last_seen_location' => 'CG Road, Navrangpura, Ahmedabad, Gujarat',
                'last_seen_lat' => 23.0300,
                'last_seen_lng' => 72.5687,
                'last_seen_date' => '2026-05-08',
                'physical_description' => 'Fair complexion, medium build, long black hair usually tied in a ponytail, dark brown eyes. Wears a thin gold chain with a pendant. Has a tattoo of a butterfly on her right wrist.',
                'medical_conditions' => 'Type 1 Diabetes - requires insulin injections',
                'clothing_description' => 'Blue jeans, white kurta with mirror work, carrying a maroon handbag. Wearing white sneakers.',
                'guardian_name' => 'Kiran Patel',
                'guardian_phone' => '+91-9834567890',
                'contact_numbers' => json_encode(['+91-9834567890']),
                'aadhaar_number' => '3456-7890-1234',
                'passport_number' => 'P1234567',
                'photo' => 'missing_persons/ananya_patel_001.jpg',
                'additional_photos' => json_encode(['missing_persons/ananya_patel_002.jpg', 'missing_persons/ananya_patel_003.jpg']),
                'fir_number' => 'FIR-1890/2026',
                'police_station' => 'Navrangpura Police Station',
                'status' => 'under_investigation',
                'priority_level' => 'high',
                'risk_score' => 75.50,
                'assigned_officer_id' => $officers->skip(2)->first()?->id ?? $officers->first()?->id,
                'created_by' => $admin->id,
                'notes' => 'Young woman reported missing after failing to return home from her college. Last phone call was to a friend at approximately 2:00 PM saying she was at CG Road. Phone has been off since. CCTV near CG Road shows her getting into an auto-rickshaw. Investigation team is tracking the auto-rickshaw. She is insulin-dependent which makes this case medically urgent.',
            ],
            [
                'case_number' => 'MP-2024-00004',
                'full_name' => 'Vikram Singh',
                'age' => 45,
                'gender' => 'male',
                'height' => 175.00,
                'weight' => 78.00,
                'last_seen_location' => 'MI Road, Jaipur, Rajasthan',
                'last_seen_lat' => 26.9124,
                'last_seen_lng' => 75.7873,
                'last_seen_date' => '2026-04-28',
                'physical_description' => 'Medium complexion, well-built, short black hair with grey at the temples, brown eyes. Has a thick moustache. Wears gold-framed glasses.',
                'medical_conditions' => 'Hypertension - takes Amlodipine 5mg daily',
                'clothing_description' => 'White kurta pajama, brown leather sandals, wearing a silver kada on right hand.',
                'guardian_name' => 'Kamla Singh',
                'guardian_phone' => '+91-9845678901',
                'contact_numbers' => json_encode(['+91-9845678901', '+91-9845678902']),
                'aadhaar_number' => '4567-8901-2345',
                'passport_number' => 'P2345678',
                'photo' => 'missing_persons/vikram_singh_001.jpg',
                'additional_photos' => json_encode(['missing_persons/vikram_singh_002.jpg']),
                'fir_number' => 'FIR-2100/2026',
                'police_station' => 'MI Road Police Station',
                'status' => 'detected',
                'priority_level' => 'medium',
                'risk_score' => 55.00,
                'assigned_officer_id' => $officers->skip(3)->first()?->id ?? $officers->first()?->id,
                'created_by' => $admin->id,
                'notes' => 'Middle-aged man missing from Jaipur. He left home for his shop on MI Road and never arrived. Has been detected on CCTV near Hawa Mahal area. His scooter was found abandoned near Johari Bazaar. Bank transactions show a withdrawal from an ATM near Amer Fort. Investigation is ongoing to trace his movements.',
            ],
            [
                'case_number' => 'MP-2024-00005',
                'full_name' => 'Meera Devi',
                'age' => 67,
                'gender' => 'female',
                'height' => 150.00,
                'weight' => 52.00,
                'last_seen_location' => 'Park Street Area, Central Kolkata, West Bengal',
                'last_seen_lat' => 22.5527,
                'last_seen_lng' => 88.3517,
                'last_seen_date' => '2026-05-01',
                'physical_description' => 'Fair complexion, frail build, grey hair tied in a bun, hazel eyes. Has traditional vermillion mark (sindoor). Wears reading glasses with gold frames.',
                'medical_conditions' => 'Moderate Alzheimer\'s disease - takes Donepezil 10mg daily. Requires supervision.',
                'clothing_description' => 'Cream-colored cotton saree with red border, wearing gold earrings and a mangalsutra. Carrying a cloth jhola bag.',
                'guardian_name' => 'Amit Kumar',
                'guardian_phone' => '+91-9856789012',
                'contact_numbers' => json_encode(['+91-9856789012', '+91-9856789013']),
                'aadhaar_number' => '5678-9012-3456',
                'passport_number' => null,
                'photo' => 'missing_persons/meera_devi_001.jpg',
                'additional_photos' => json_encode(['missing_persons/meera_devi_002.jpg']),
                'fir_number' => 'FIR-1567/2026',
                'police_station' => 'Park Street Police Station',
                'status' => 'found_safe',
                'priority_level' => 'low',
                'risk_score' => 15.00,
                'assigned_officer_id' => $officers->first()?->id,
                'created_by' => $admin->id,
                'notes' => 'Elderly woman with Alzheimer\'s who wandered from her home. Was found safe at Howrah Railway Station by RPF personnel after 3 days. She was confused and could not recall her address. Identified through the missing person database when a police patrol ran her photo through the system. Case has been closed. She has been reunited with her family.',
            ],
        ];

        foreach ($cases as $caseData) {
            MissingPerson::create($caseData);
        }

        $this->command->info('Created 5 missing person cases successfully.');
    }
}
