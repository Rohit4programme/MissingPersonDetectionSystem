<?php

namespace Tests\Feature;

use App\Models\Camera;
use App\Models\Detection;
use App\Models\MissingPerson;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DetectionTest extends TestCase
{
    use RefreshDatabase;

    protected User $officer;
    protected MissingPerson $person;
    protected Camera $camera;

    protected function setUp(): void
    {
        parent::setUp();

        $this->officer = User::factory()->create(['role' => 'officer']);
        $this->person = MissingPerson::factory()->create([
            'created_by' => $this->officer->id,
        ]);
        $this->camera = Camera::factory()->create([
            'created_by' => $this->officer->id,
        ]);
    }

    public function test_can_list_detections(): void
    {
        Detection::factory()->count(5)->create([
            'person_id' => $this->person->id,
            'camera_id' => $this->camera->id,
        ]);

        $response = $this->actingAs($this->officer)->getJson('/api/detections');

        $response->assertStatus(200)
            ->assertJsonCount(5, 'data');
    }

    public function test_can_create_detection(): void
    {
        $response = $this->actingAs($this->officer)->postJson('/api/detections', [
            'person_id' => $this->person->id,
            'camera_id' => $this->camera->id,
            'confidence_score' => 0.92,
            'latitude' => 28.6129,
            'longitude' => 77.2295,
            'location_name' => 'Near India Gate',
            'source' => 'cctv',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('detections', [
            'person_id' => $this->person->id,
            'confidence_score' => 0.92,
        ]);
    }

    public function test_officer_can_verify_detection(): void
    {
        $detection = Detection::factory()->create([
            'person_id' => $this->person->id,
            'is_verified' => false,
        ]);

        $response = $this->actingAs($this->officer)->putJson("/api/detections/{$detection->id}/verify", [
            'is_verified' => true,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('detections', [
            'id' => $detection->id,
            'is_verified' => true,
            'verified_by' => $this->officer->id,
        ]);
    }

    public function test_can_filter_detections_by_confidence(): void
    {
        Detection::factory()->create([
            'person_id' => $this->person->id,
            'confidence_score' => 0.95,
        ]);
        Detection::factory()->create([
            'person_id' => $this->person->id,
            'confidence_score' => 0.50,
        ]);

        $response = $this->actingAs($this->officer)
            ->getJson('/api/detections?confidence_min=0.80');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_can_get_recent_detections(): void
    {
        Detection::factory()->count(10)->create([
            'person_id' => $this->person->id,
        ]);

        $response = $this->actingAs($this->officer)
            ->getJson('/api/recent-detections?limit=5');

        $response->assertStatus(200);
    }

    public function test_can_get_detection_stats(): void
    {
        Detection::factory()->count(5)->create([
            'person_id' => $this->person->id,
        ]);

        $response = $this->actingAs($this->officer)
            ->getJson('/api/detection-stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => ['total', 'verified_count'],
            ]);
    }
}
