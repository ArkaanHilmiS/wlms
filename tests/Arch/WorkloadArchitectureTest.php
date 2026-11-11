<?php

declare(strict_types=1);

test('Workload domain layer does not depend on infrastructure, presentation, or laravel framework')
    ->expect('App\Modules\Workload\Domain')
    ->not->toUse([
        'App\Modules\Workload\Infrastructure',
        'App\Modules\Workload\Presentation',
        'App\Modules\Workload\Application',
        'Illuminate',
    ]);

test('Workload application layer does not depend on presentation or infrastructure')
    ->expect('App\Modules\Workload\Application')
    ->not->toUse([
        'App\Modules\Workload\Presentation',
        'App\Modules\Workload\Infrastructure',
        'Illuminate\Http',
        'Illuminate\Database',
    ])
    ->ignoring([
        'App\Modules\Workload\Application\Queries',
    ]);

test('Workload presentation layer only calls application layer (and CQRS queries)')
    ->expect('App\Modules\Workload\Presentation')
    ->not->toUse([
        'App\Modules\Workload\Infrastructure\Persistence\Eloquent\Repositories',
        'App\Modules\Workload\Infrastructure\Listeners',
        'App\Modules\Workload\Domain\Repositories',
    ]);

test('No side effects in Application or Presentation layer (Should use Queue/Events)')
    ->expect(['App\Modules\Workload\Presentation', 'App\Modules\Workload\Application'])
    ->not->toUse([
        'Illuminate\Support\Facades\Mail',
        'Illuminate\Support\Facades\Http', // No direct API calls
    ]);
