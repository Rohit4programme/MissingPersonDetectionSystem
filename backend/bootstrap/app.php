<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__ . '/../routes/api.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Register custom middleware aliases
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
            'force.json' => \App\Http\Middleware\ForceJsonResponse::class,
        ]);

        // Append ForceJsonResponse to the API middleware group
        $middleware->api(prepend: [
            \App\Http\Middleware\ForceJsonResponse::class,
        ]);

        // Trust proxies for accurate IP detection behind load balancers
        $middleware->trustProxies(at: '*');

        // Disable maintenance mode exception handling for API
        // so that 503 responses are returned as JSON
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
