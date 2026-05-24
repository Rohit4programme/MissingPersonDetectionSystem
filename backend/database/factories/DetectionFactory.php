<?php

namespace Database\Factories;

use App\Models\Camera;
use App\Models\MissingPerson;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DetectionFactory extends Factory
{
    protected $model = \App\Models\Detection::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        $isVerified = fake()->boolean(40);
        $verifiedAt = $isVerified ? fake()->dateTimeBetween('-7 days', 'now') : null;

        $indianCities = [
            ['name' => 'Connaught Place, Delhi', 'lat' => 28.6315, 'lng' => 77.2167],
            ['name' => 'Andheri Station, Mumbai', 'lat' => 19.1197, 'lng' => 72.8464],
            ['name' => 'MG Road, Bangalore', 'lat' => 12.9758, 'lng' => 77.6068],
            ['name' => 'T. Nagar, Chennai', 'lat' => 13.0405, 'lng' => 80.2337],
            ['name' => 'Park Street, Kolkata', 'lat' => 22.5527, 'lng' => 88.3517],
            ['name' => 'Secunderabad Station, Hyderabad', 'lat' => 17.4399, 'lng' => 78.5010],
            ['name' => 'Shivajinagar, Pune', 'lat' => 18.5308, 'lng' => 73.8475],
            ['name' => 'CG Road, Ahmedabad', 'lat' => 23.0300, 'lng' => 72.5687],
            ['name' => 'MI Road, Jaipur', 'lat' => 26.9124, 'lng' => 75.7873],
            ['name' => 'Hazratganj, Lucknow', 'lat' => 26.8550, 'lng' => 80.9480],
        ];

        $location = fake()->randomElement($indianCities);

        return [
            'person_id' => MissingPerson::factory(),
            'camera_id' => Camera::factory(),
            'sighting_id' => null,
            'confidence_score' => fake()->randomFloat(4, 0.50, 0.99),
            'screenshot_path' => 'detections/screenshots/' . fake()->uuid() . '.jpg',
            'bounding_box' => json_encode([
                'x' => fake()->numberBetween(100, 300),
                'y' => fake()->numberBetween(50, 200),
                'width' => fake()->numberBetween(100, 200),
                'height' => fake()->numberBetween(100, 200),
            ]),
            'frame_timestamp' => fake()->dateTimeBetween('-30 days', 'now'),
            'latitude' => $location['lat'] + fake()->randomFloat(4, -0.01, 0.01),
            'longitude' => $location['lng'] + fake()->randomFloat(4, -0.01, 0.01),
            'location_name' => $location['name'],
            'source' => fake()->randomElement(['cctv', 'public_upload', 'officer_upload']),
            'is_verified' => $isVerified,
            'verified_by' => $isVerified ? User::where('role', 'officer')->first()?->id : null,
            'ai_metadata' => json_encode([
                'model' => 'facenet_v2',
                'processing_time_ms' => fake()->numberBetween(50, 500),
                'face_quality' => fake()->randomFloat(2, 0.3, 1.0),
            ]),
        ];
    }

    /**
     * Set as verified detection.
     */
    public function verified(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_verified' => true,
            'verified_by' => User::where('role', 'officer')->first()?->id,
        ]);
    }

    /**
     * Set as CCTV detection.
     */
    public function fromCCTV(): static
    {
        return $this->state(fn (array $attributes) => [
            'source' => 'cctv',
            'camera_id' => Camera::factory(),
        ]);
    }

    /**
     * Set as public upload detection.
     */
    public function fromPublicUpload(): static
    {
        return $this->state(fn (array $attributes) => [
            'source' => 'public_upload',
            'camera_id' => null,
        ]);
    }

    /**
     * Set as officer upload detection.
     */
    public function fromOfficerUpload(): static
    {
        return $this->state(fn (array $attributes) => [
            'source' => 'officer_upload',
            'camera_id' => null,
        ]);
    }

    /**
     * Set high confidence.
     */
    public function highConfidence(): static
    {
        return $this->state(fn (array $attributes) => [
            'confidence_score' => fake()->randomFloat(4, 0.85, 0.99),
        ]);
    }

    /**
     * Set low confidence.
     */
    public function lowConfidence(): static
    {
        return $this->state(fn (array $attributes) => [
            'confidence_score' => fake()->randomFloat(4, 0.50, 0.65),
        ]);
    }
}
