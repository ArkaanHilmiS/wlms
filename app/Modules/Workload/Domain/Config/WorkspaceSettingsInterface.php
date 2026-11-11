<?php

declare(strict_types=1);

namespace App\Modules\Workload\Domain\Config;

interface WorkspaceSettingsInterface
{
    public function getMaxWorkspacesPerGroup(?string $groupId = null): int;
}
