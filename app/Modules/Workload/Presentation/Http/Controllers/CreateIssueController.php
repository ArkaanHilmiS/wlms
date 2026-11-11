<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Presentation\Http\Requests\CreateIssueHttpRequest;
use Illuminate\Http\JsonResponse;

final class CreateIssueController
{
    public function __construct(private readonly IssueController $issueController) {}

    public function __invoke(CreateIssueHttpRequest $request): JsonResponse
    {
        $projectId = (string) ($request->input('project_id') ?? $request->validated('project_id') ?? '');

        return $this->issueController->store($request, $projectId);
    }
}
