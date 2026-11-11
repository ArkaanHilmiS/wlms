<?php

declare(strict_types=1);

use App\Modules\Workload\Domain\Entities\Issue;
use App\Modules\Workload\Domain\ValueObjects\IssueId;
use App\Modules\Workload\Domain\ValueObjects\IssueNumber;
use App\Modules\Workload\Domain\ValueObjects\IssueTypeId;
use App\Modules\Workload\Domain\ValueObjects\PriorityId;
use App\Modules\Workload\Domain\ValueObjects\ProjectId;
use App\Modules\Workload\Domain\ValueObjects\StatusId;
use App\Modules\Workload\Presentation\Http\Controllers\IssueLinkController;

test('tokenize removes stopwords, punctuation, and short words', function () {
    $tokens = IssueLinkController::tokenize('Gagal login dan error 500 pada API untuk Bank Jatim di MII!');

    expect($tokens)->toBe(['gagal', 'login', 'error', '500', 'api', 'bank', 'jatim', 'mii']);
});

test('similarityScore returns 1.0 for identical titles and high score for similar issues', function () {
    $exact = IssueLinkController::similarityScore(
        'Gagal generate laporan SLA bulanan Bank Jatim',
        'Gagal generate laporan SLA bulanan Bank Jatim'
    );

    $similar = IssueLinkController::similarityScore(
        'Gagal generate laporan SLA bulanan pada portal MII',
        'Error generate laporan SLA bulanan di sistem MII'
    );

    $typo = IssueLinkController::similarityScore(
        'Sinkronisasi data nasabah Bank Jatim gagal',
        'Sinkronisasi data nasbah Bank Jatim gagal'
    );

    $unrelated = IssueLinkController::similarityScore(
        'Update warna tombol halaman profil user',
        'Timeout koneksi database core banking saat EOD'
    );

    expect($exact)->toBe(1.0)
        ->and($similar)->toBeGreaterThanOrEqual(0.35)
        ->and($typo)->toBeGreaterThanOrEqual(0.65)
        ->and($unrelated)->toBeLessThan(0.35);
});

test('Issue entity stores start_date, due_date, and parent_id on creation', function () {
    $issue = Issue::create(
        new IssueId('01923abc-0000-7000-8000-000000000101'),
        new ProjectId('01923abc-0000-7000-8000-000000000202'),
        new IssueNumber('BJT-001', 1),
        'Integrasi SSO Bank Jatim & MII',
        'Implementasi OAuth2',
        new IssueTypeId('type-task'),
        new PriorityId('prio-high'),
        new StatusId('status-todo'),
        null,
        'user-reporter',
        7200,
        '2026-10-01',
        '2026-10-15',
        '01923abc-0000-7000-8000-000000000099',
    );

    expect($issue->getStartDate())->toBe('2026-10-01')
        ->and($issue->getDueDate())->toBe('2026-10-15')
        ->and($issue->getParentId())->toBe('01923abc-0000-7000-8000-000000000099')
        ->and($issue->getOriginalEstimateSeconds())->toBe(7200)
        ->and($issue->flushEvents())->toHaveCount(1)
        ->and($issue->flushEvents())->toBeEmpty();
});
