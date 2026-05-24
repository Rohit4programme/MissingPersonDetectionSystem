<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * Checks if the authenticated user has one of the specified roles.
     * Usage in routes: ->middleware('role:admin,officer')
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles  One or more role names separated by commas
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Flatten the roles array in case comma-separated values are passed as a single argument
        $allowedRoles = [];
        foreach ($roles as $role) {
            $allowedRoles = array_merge($allowedRoles, array_map('trim', explode(',', $role)));
        }

        // Remove empty values
        $allowedRoles = array_filter($allowedRoles);

        // Check if user has one of the allowed roles
        if (empty($allowedRoles) || !$user->hasRole($allowedRoles)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. You do not have the required permissions.',
                'required_roles' => $allowedRoles,
            ], 403);
        }

        return $next($request);
    }
}
