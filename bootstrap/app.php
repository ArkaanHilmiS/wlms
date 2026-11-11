<?php

use App\Shared\Presentation\Http\Middleware\HandleAppearance;
use App\Shared\Presentation\Http\Middleware\HandleInertiaRequests;
use App\Shared\Presentation\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\AuthenticateSession;

if (! class_exists('AppAuthenticateSession')) {
    class AppAuthenticateSession extends AuthenticateSession
    {
        protected function guard()
        {
            $guard = parent::guard();

            if (! method_exists($guard, 'viaRemember')) {
                return $this->auth->guard('web');
            }

            return $guard;
        }
    }
}

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            SetLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'auth.session' => AppAuthenticateSession::class,
        ]);

        $middleware->authenticateSessions();

        $middleware->statefulApi();

        $middleware->api(append: [
            'throttle:api',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
