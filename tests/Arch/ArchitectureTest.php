<?php

test('domain layer does not depend on infrastructure, application, presentation, or laravel framework')
    ->expect('App\Modules\*\Domain')
    ->not->toUse([
        'App\Modules\*\Infrastructure',
        'App\Modules\*\Application',
        'App\Modules\*\Presentation',
        'Illuminate',
    ])
    ->ignoring([
        'App\Modules\Notification\Domain\Events\NewNotification',
    ]);

test('application layer does not depend on presentation or infrastructure')
    ->expect('App\Modules\*\Application')
    ->not->toUse([
        'App\Modules\*\Presentation',
        'App\Modules\Collaboration\Infrastructure\Persistence\Repositories',
        'App\Modules\Workload\Infrastructure\Persistence\Eloquent\Repositories',
        'Illuminate\Http',
    ]);

test('presentation layer only calls application layer')
    ->expect('App\Modules\*\Presentation')
    ->not->toUse([
        'App\Modules\Collaboration\Infrastructure\Persistence\Repositories',
        'App\Modules\Workload\Infrastructure\Persistence\Eloquent\Repositories',
        'App\Modules\Collaboration\Domain\Repositories',
        'App\Modules\Workload\Domain\Repositories',
    ]);

test('modules do not cross-import internal domain entities')
    ->expect('App\Modules\Workload\Domain')
    ->not->toUse([
        'App\Modules\Identity\Domain',
    ]);

test('controllers do not use eloquent models directly')
    ->expect('App\Modules\*\Presentation')
    ->not->toUse('Illuminate\Database\Eloquent\Model');

test('KnowledgeBase presentation does not bypass application layer')
    ->expect('App\Modules\KnowledgeBase\Presentation')
    ->not->toUse('App\Modules\KnowledgeBase\Infrastructure');

test('shared namespace does not depend on specific modules')
    ->expect('App\Shared')
    ->not->toUse([
        'App\Modules\Workload',
        'App\Modules\Identity',
        'App\Modules\Collaboration',
        'App\Modules\KnowledgeBase',
        'App\Modules\Notification',
    ]);
