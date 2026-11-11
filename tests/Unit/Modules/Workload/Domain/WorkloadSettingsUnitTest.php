<?php

declare(strict_types=1);

use App\Modules\Workload\Infrastructure\Config\WorkloadSettings;
use Carbon\CarbonImmutable;

test('addBusinessDays skips weekends and configured holidays', function () {
    // Friday 2026-10-30
    $start = CarbonImmutable::parse('2026-10-30');
    $workingDays = [1, 2, 3, 4, 5]; // Mon..Fri
    $holidays = ['2026-11-02']; // Monday is a holiday

    // +1 business day from Friday 2026-10-30:
    // Sat 10-31 (skip), Sun 11-01 (skip), Mon 11-02 (holiday skip) -> Tue 2026-11-03
    $due1 = WorkloadSettings::addBusinessDays($start, 1, $workingDays, $holidays);
    expect($due1->toDateString())->toBe('2026-11-03');

    // +3 business days from Friday 2026-10-30 -> Tue(1), Wed(2), Thu(3) = 2026-11-05
    $due3 = WorkloadSettings::addBusinessDays($start, 3, $workingDays, $holidays);
    expect($due3->toDateString())->toBe('2026-11-05');
});

test('addBusinessDays falls back to Mon-Fri when workingDays array is empty', function () {
    $start = CarbonImmutable::parse('2026-10-30'); // Friday
    $due = WorkloadSettings::addBusinessDays($start, 1, [], []);
    expect($due->toDateString())->toBe('2026-11-02');
});
