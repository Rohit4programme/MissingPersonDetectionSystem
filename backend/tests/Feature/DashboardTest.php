<?php

namespace Tests\Feature;

use App\Models\Detection;
use App\Models\MissingPerson;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    protected User $officer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->officer = User::factory()->create(['role' => 'officer']);
    }

    public function test_dashboard_returns_stats(): void
    {
        MissingPerson::factory()->count(5)->create([
            'created_by' => $this->officer->id,
        ]);

        $response = $this->actingAs($this->officer)->getJson('/api/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'active_cases',
                    'total_detections',
                    'pending_reports',
                    'success_rate',
                ],
            ]);
    }

    public function test_dashboard_returns_recent_activity(): void
    {
        $response = $this->actingAs($this->officer)->getJson('/api/dashboard/activity');

        $response->assertStatus(200);
    }

    public function test_dashboard_returns_trends(): void
    {
        $response = $this->actingAs($this->officer)->getJson('/api/dashboard/trends');

        $response->assertStatus(200);
    }

    public function test_dashboard_returns_heatmap_data(): void
    {
        Detection::factory()->count(3)->create([
            'person_id' => MissingPerson::factory()->create(['created_by' => $this->officer->id])->id,
            'latitude' => 28.6129,
            'longitude' => 77.2295,
        ]);

        $response = $this->actingAs($this->officer)->getJson('/api/dashboard/heatmap');

        $response->assertStatus(200);
    }

    public function test_unauthenticated_user_cannot_access_dashboard(): void
    {
        $response = $this->getJson('/api/dashboard/stats');

        $response->assertStatus(401);
    }
}
