<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MissingPerson>
 */
class MissingPersonFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = \App\Models\MissingPerson::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        $gender = $this->faker->randomElement(['male', 'female']);
        $age = $this->faker->numberBetween(5, 70);

        $indianCities = [
            ['area' => 'Connaught Place, Central District', 'city' => 'New Delhi', 'lat' => 28.6315, 'lng' => 77.2167],
            ['area' => 'Andheri West, Near Railway Station', 'city' => 'Mumbai', 'lat' => 19.1197, 'lng' => 72.8464],
            ['area' => 'MG Road, Central Area', 'city' => 'Bangalore', 'lat' => 12.9758, 'lng' => 77.6068],
            ['area' => 'T. Nagar Market Area', 'city' => 'Chennai', 'lat' => 13.0405, 'lng' => 80.2337],
            ['area' => 'Park Street, Central Area', 'city' => 'Kolkata', 'lat' => 22.5527, 'lng' => 88.3517],
            ['area' => 'Charminar, Old City Area', 'city' => 'Hyderabad', 'lat' => 17.3616, 'lng' => 78.4747],
            ['area' => 'FC Road, Shivajinagar', 'city' => 'Pune', 'lat' => 18.5308, 'lng' => 73.8475],
            ['area' => 'CG Road, Navrangpura', 'city' => 'Ahmedabad', 'lat' => 23.0300, 'lng' => 72.5687],
            ['area' => 'MI Road, Pink City Area', 'city' => 'Jaipur', 'lat' => 26.9124, 'lng' => 75.7873],
            ['area' => 'Hazratganj, Central Area', 'city' => 'Lucknow', 'lat' => 26.8550, 'lng' => 80.9480],
        ];

        $location = $this->faker->randomElement($indianCities);
        $bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

        $adminUser = User::where('role', 'admin')->first();
        $officer = User::where('role', 'officer')->first();

        return [
            'case_number' => 'MP-' . date('Y') . '-' . str_pad($this->faker->unique()->numberBetween(1, 99999), 5, '0', STR_PAD_LEFT),
            'full_name' => $this->faker->firstName($gender === 'male' ? 'male' : 'female') . ' ' . $this->faker->lastName,
            'age' => $age,
            'gender' => $gender,
            'height' => $this->faker->randomFloat(2, 50, 200),
            'weight' => $this->faker->randomFloat(2, 10, 120),
            'last_seen_location' => $location['area'] . ', ' . $location['city'],
            'last_seen_lat' => $location['lat'] + $this->faker->randomFloat(4, -0.02, 0.02),
            'last_seen_lng' => $location['lng'] + $this->faker->randomFloat(4, -0.02, 0.02),
            'last_seen_date' => $this->faker->dateTimeBetween('-90 days', '-1 day'),
            'physical_description' => $this->faker->paragraph(2),
            'medical_conditions' => $this->faker->optional(0.3)->sentence,
            'clothing_description' => $this->faker->optional(0.8)->sentence,
            'guardian_name' => $this->faker->name,
            'guardian_phone' => '+91-' . $this->faker->numerify('##########'),
            'contact_numbers' => json_encode(['+91-' . $this->faker->numerify('##########')]),
            'aadhaar_number' => $this->faker->optional(0.5)->numerify('####-####-####'),
            'passport_number' => $this->faker->optional(0.2)->bothify('??#######'),
            'photo' => 'missing_persons/' . $this->faker->uuid . '.jpg',
            'additional_photos' => null,
            'fir_number' => $this->faker->optional(0.7)->bothify('FIR-####/' . date('Y')),
            'police_station' => $this->faker->optional(0.6)->city . ' Police Station',
            'status' => $this->faker->randomElement(['missing', 'missing', 'under_investigation', 'detected', 'found_safe']),
            'priority_level' => $this->faker->randomElement(['low', 'medium', 'high', 'critical']),
            'risk_score' => $this->faker->randomFloat(2, 0, 100),
            'assigned_officer_id' => $officer?->id,
            'created_by' => $adminUser?->id ?? User::factory(),
            'notes' => $this->faker->optional(0.5)->paragraph,
        ];
    }

    /**
     * State for a child case.
     */
    public function child(): static
    {
        return $this->state(fn (array $attributes) => [
            'age' => $this->faker->numberBetween(2, 12),
            'priority_level' => 'critical',
        ]);
    }

    /**
     * State for an elderly case.
     */
    public function elderly(): static
    {
        return $this->state(fn (array $attributes) => [
            'age' => $this->faker->numberBetween(60, 85),
            'medical_conditions' => $this->faker->randomElement(['Alzheimer\'s disease', 'Dementia', 'Diabetes', 'Hypertension']),
        ]);
    }

    /**
     * State for missing status.
     */
    public function missing(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'missing',
        ]);
    }

    /**
     * State for detected status.
     */
    public function detected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'detected',
        ]);
    }

    /**
     * State for found safe status.
     */
    public function foundSafe(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'found_safe',
        ]);
    }

    /**
     * State for high priority.
     */
    public function highPriority(): static
    {
        return $this->state(fn (array $attributes) => [
            'priority_level' => 'high',
        ]);
    }

    /**
     * State for critical priority.
     */
    public function critical(): static
    {
        return $this->state(fn (array $attributes) => [
            'priority_level' => 'critical',
        ]);
    }
}
