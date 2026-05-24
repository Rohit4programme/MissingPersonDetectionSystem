<?php

namespace Tests\Feature;

use App\Models\MissingPerson;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class CaseTest extends TestCase
{
    use RefreshDatabase;

    protected User $officer;
    protected User $admin;
    protected User $publicUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->officer = User::factory()->create(['role' => 'officer']);
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->publicUser = User::factory()->create(['role' => 'public']);
    }

    public function test_officer_can_create_case(): void
    {
        $response = $this->actingAs($this->officer)->postJson('/api/cases', [
            'full_name' => 'Test Person',
            'age' => 25,
            'gender' => 'male',
            'height' => "5'8\"",
            'weight' => '70 kg',
            'last_seen_location' => 'Test Location',
            'last_seen_lat' => 28.6129,
            'last_seen_lng' => 77.2295,
            'last_seen_date' => '2024-01-15',
            'physical_description' => 'Test description',
            'clothing_description' => 'Blue shirt',
            'fir_number' => 'FIR-001',
            'police_station' => 'Test PS',
            'priority_level' => 'high',
            'photo' => UploadedFile::fake()->image('photo.jpg'),
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => ['id', 'case_number', 'status'],
            ]);

        $this->assertDatabaseHas('missing_persons', [
            'full_name' => 'Test Person',
            'status' => 'missing',
        ]);
    }

    public function test_public_user_cannot_create_case(): void
    {
        $response = $this->actingAs($this->publicUser)->postJson('/api/cases', [
            'full_name' => 'Test Person',
        ]);

        $response->assertStatus(403);
    }

    public function test_user_can_list_cases(): void
    {
        MissingPerson::factory()->count(5)->create([
            'created_by' => $this->officer->id,
        ]);

        $response = $this->actingAs($this->officer)->getJson('/api/cases');

        $response->assertStatus(200)
            ->assertJsonCount(5, 'data');
    }

    public function test_user_can_view_case_detail(): void
    {
        $case = MissingPerson::factory()->create([
            'created_by' => $this->officer->id,
        ]);

        $response = $this->actingAs($this->officer)->getJson("/api/cases/{$case->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $case->id]);
    }

    public function test_officer_can_update_case_status(): void
    {
        $case = MissingPerson::factory()->create([
            'created_by' => $this->officer->id,
            'status' => 'missing',
        ]);

        $response = $this->actingAs($this->officer)->putJson("/api/cases/{$case->id}/status", [
            'status' => 'found_safe',
            'notes' => 'Person found safe',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('missing_persons', [
            'id' => $case->id,
            'status' => 'found_safe',
        ]);
    }

    public function test_admin_can_assign_officer(): void
    {
        $case = MissingPerson::factory()->create([
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/cases/{$case->id}/assign", [
            'officer_id' => $this->officer->id,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('missing_persons', [
            'id' => $case->id,
            'assigned_officer_id' => $this->officer->id,
        ]);
    }

    public function test_cases_can_be_filtered_by_status(): void
    {
        MissingPerson::factory()->count(3)->create([
            'created_by' => $this->officer->id,
            'status' => 'missing',
        ]);
        MissingPerson::factory()->count(2)->create([
            'created_by' => $this->officer->id,
            'status' => 'found_safe',
        ]);

        $response = $this->actingAs($this->officer)
            ->getJson('/api/cases?status=missing');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_cases_can_be_searched(): void
    {
        MissingPerson::factory()->create([
            'full_name' => 'Priya Sharma',
            'created_by' => $this->officer->id,
        ]);
        MissingPerson::factory()->create([
            'full_name' => 'Rahul Kumar',
            'created_by' => $this->officer->id,
        ]);

        $response = $this->actingAs($this->officer)
            ->getJson('/api/search?q=Priya');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_case_number_is_auto_generated(): void
    {
        $response = $this->actingAs($this->officer)->postJson('/api/cases', [
            'full_name' => 'Test Person',
            'age' => 30,
            'gender' => 'female',
            'last_seen_location' => 'Location',
            'last_seen_date' => '2024-01-15',
            'photo' => UploadedFile::fake()->image('photo.jpg'),
            'priority_level' => 'medium',
        ]);

        $case = MissingPerson::latest()->first();
        $this->assertStringStartsWith('MP-', $case->case_number);
    }

    public function test_statistics_endpoint_returns_data(): void
    {
        MissingPerson::factory()->count(5)->create([
            'created_by' => $this->officer->id,
        ]);

        $response = $this->actingAs($this->officer)->getJson('/api/cases-stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => ['total_cases'],
            ]);
    }
}
