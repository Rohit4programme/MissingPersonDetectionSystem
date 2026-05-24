<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = User::class;

    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'first_name' => $this->faker->firstName,
            'last_name' => $this->faker->lastName,
            'email' => $this->faker->unique()->safeEmail,
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'phone' => $this->faker->optional(0.8)->phoneNumber,
            'role' => 'public',
            'is_active' => true,
            'notify_email' => true,
            'notify_sms' => false,
            'notify_push' => true,
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * State for a public user.
     */
    public function public(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'public',
            'badge_number' => null,
            'department' => null,
            'jurisdiction_id' => null,
        ]);
    }

    /**
     * State for an officer user.
     */
    public function officer(): static
    {
        $departments = [
            'Missing Persons Unit',
            'Criminal Investigation Department',
            'Cyber Crime Cell',
            'Traffic Police',
            'Local Law Enforcement',
        ];

        return $this->state(fn (array $attributes) => [
            'role' => 'officer',
            'badge_number' => 'BADGE-' . $this->faker->unique()->numerify('#####'),
            'department' => $this->faker->randomElement($departments),
            'notify_sms' => true,
        ]);
    }

    /**
     * State for an admin user.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'admin',
            'badge_number' => 'ADMIN-' . $this->faker->unique()->numerify('####'),
            'department' => 'Administration',
            'notify_email' => true,
            'notify_sms' => true,
            'notify_push' => true,
        ]);
    }

    /**
     * State for a super admin user.
     */
    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'super_admin',
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'email' => 'admin@mpds.gov',
            'badge_number' => 'SA-0001',
            'department' => 'System Administration',
            'notify_email' => true,
            'notify_sms' => true,
            'notify_push' => true,
        ]);
    }

    /**
     * State for an inactive user.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
