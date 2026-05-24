<?php

namespace Tests\Feature;

use App\Models\MissingPerson;
use App\Models\Sighting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class SightingTest extends TestCase
{
    use RefreshDatabase;

    protected User $officer;
    protected MissingPerson $person;

    protected function setUp(): void
    {
        parent::setUp();

        $this->officer = User::factory()->create(['role' => 'officer']);
        $this->person = MissingPerson::factory()->create([
            'created_by' => $this->officer->id,
        ]);
    }

    public function test_public_user_can_submit_sighting(): void
    {
        $user = User::factory()->create(['role' => 'public']);

        $response = $this->actingAs($user)->postJson('/api/sightings', [
            'person_id' => $this->person->id,
            'reporter_name' => 'Citizen',
            'reporter_phone' => '+91-9876543210',
            'latitude' => 28.6129,
            'longitude' => 77.2295,
            'location_name' => 'India Gate',
            'notes' => 'Saw person near India Gate',
            'image' => UploadedFile::fake()->image('sighting.jpg'),
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('sightings', [
            'person_id' => $this->person->id,
            'status' => 'pending',
        ]);
    }

    public function test_anonymous_sighting_submission(): void
    {
        $response = $this->postJson('/api/sightings', [
            'person_id' => $this->person->id,
            'is_anonymous' => true,
            'latitude' => 28.6129,
            'longitude' => 77.2295,
            'location_name' => 'India Gate',
            'notes' => 'Anonymous sighting',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('sightings', [
            'person_id' => $this->person->id,
            'is_anonymous' => true,
        ]);
    }

    public function test_officer_can_verify_sighting(): void
    {
        $sighting = Sighting::factory()->create([
            'person_id' => $this->person->id,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->officer)->putJson("/api/sightings/{$sighting->id}/verify", [
            'status' => 'verified',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('sightings', [
            'id' => $sighting->id,
            'status' => 'verified',
            'verified_by' => $this->officer->id,
        ]);
    }

    public function test_can_get_pending_sightings(): void
    {
        Sighting::factory()->count(3)->create([
            'person_id' => $this->person->id,
            'status' => 'pending',
        ]);
        Sighting::factory()->count(2)->create([
            'person_id' => $this->person->id,
            'status' => 'verified',
        ]);

        $response = $this->actingAs($this->officer)->getJson('/api/pending-sightings');

        $response->assertStatus(200);
    }

    public function test_sighting_requires_person_id(): void
    {
        $response = $this->postJson('/api/sightings', [
            'notes' => 'Missing person_id',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['person_id']);
    }
}
