<?php

namespace Database\Factories;

use App\Models\MissingPerson;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class SightingFactory extends Factory
{
    protected $model = \App\Models\Sighting::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        $isAnonymous = fake()->boolean(25);

        $indianCities = [
            ['name' => 'Old Delhi Railway Station', 'lat' => 28.6610, 'lng' => 77.2330],
            ['name' => 'Chhatrapati Shivaji Terminus, Mumbai', 'lat' => 18.9398, 'lng' => 72.8355],
            ['name' => 'City Railway Station, Bangalore', 'lat' => 12.9763, 'lng' => 77.5635],
            ['name' => 'Central Station, Chennai', 'lat' => 13.0827, 'lng' => 80.2707],
            ['name' => 'Howrah Station, Kolkata', 'lat' => 22.5849, 'lng' => 88.3420],
            ['name' => 'Nampally Station, Hyderabad', 'lat' => 17.3945, 'lng' => 78.4683],
            ['name' => 'Pune Railway Station', 'lat' => 18.5286, 'lng' => 73.8745],
            ['name' => 'Kalupur Station, Ahmedabad', 'lat' => 23.0318, 'lng' => 72.6047],
            ['name' => 'Jaipur Railway Station', 'lat' => 26.9196, 'lng' => 75.7878],
            ['name' => 'Charbagh Station, Lucknow', 'lat' => 26.8546, 'lng' => 80.9227],
        ];

        $location = fake()->randomElement($indianCities);

        return [
            'person_id' => MissingPerson::factory(),
            'reporter_id' => $isAnonymous ? null : User::factory(),
            'reporter_name' => $isAnonymous ? null : fake()->name,
            'reporter_phone' => $isAnonymous ? null : '+91-' . fake()->numerify('##########'),
            'reporter_email' => $isAnonymous ? null : fake()->optional(0.5)->safeEmail,
            'is_anonymous' => $isAnonymous,
            'latitude' => $location['lat'] + fake()->randomFloat(4, -0.02, 0.02),
            'longitude' => $location['lng'] + fake()->randomFloat(4, -0.02, 0.02),
            'location_name' => $location['name'] . ', ' . fake()->city,
            'image_path' => fake()->optional(0.6)->uuid . '.jpg',
            'video_path' => null,
            'notes' => fake()->sentence,
            'device_info' => json_encode([
                'platform' => fake()->randomElement(['android', 'ios', 'web']),
                'browser' => fake()->randomElement(['Chrome', 'Safari', 'Firefox', null]),
            ]),
            'status' => fake()->randomElement(['pending', 'pending', 'verified', 'rejected']),
            'verified_by' => null,
            'ai_similarity_score' => fake()->optional(0.4)->randomFloat(4, 0.40, 0.95),
        ];
    }

    /**
     * Set as verified sighting.
     */
    public function verified(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'verified',
            'verified_by' => User::where('role', 'officer')->first()?->id,
            'ai_similarity_score' => fake()->randomFloat(4, 0.70, 0.95),
        ]);
    }

    /**
     * Set as rejected sighting.
     */
    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'rejected',
            'verified_by' => User::where('role', 'officer')->first()?->id,
            'ai_similarity_score' => fake()->randomFloat(4, 0.10, 0.50),
        ]);
    }

    /**
     * Set as pending sighting.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'verified_by' => null,
        ]);
    }

    /**
     * Set as spam sighting.
     */
    public function spam(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'spam',
            'verified_by' => null,
        ]);
    }

    /**
     * Set as anonymous report.
     */
    public function anonymous(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_anonymous' => true,
            'reporter_id' => null,
            'reporter_name' => null,
            'reporter_phone' => null,
            'reporter_email' => null,
        ]);
    }
}
