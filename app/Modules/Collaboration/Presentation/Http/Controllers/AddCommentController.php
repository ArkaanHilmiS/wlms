<?php

declare(strict_types=1);

namespace App\Modules\Collaboration\Presentation\Http\Controllers;

use App\Modules\Collaboration\Application\DTOs\AddCommentInput;
use App\Modules\Collaboration\Application\UseCases\AddCommentToIssueUseCase;
use App\Modules\Collaboration\Presentation\Http\Requests\AddCommentHttpRequest;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AddCommentController extends Controller
{
    public function __construct(
        private readonly AddCommentToIssueUseCase $useCase
    ) {}

    public function index(Request $request, string $issueId): JsonResponse
    {
        $user = $request->user();
        $projectId = DB::table('issues')->where('id', $issueId)->value('project_id');
        if (! $user || ! $projectId || ! WorkloadAccessChecker::canViewProject($user->id, (string) $projectId)) {
            abort(403, 'Unauthorized.');
        }

        $comments = DB::table('comments')
            ->where('issue_id', $issueId)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'asc')
            ->get();

        $authors = DB::table('users')
            ->whereIn('id', $comments->pluck('author_id')->unique()->filter())
            ->pluck('name', 'id');

        $data = $comments->map(fn (\stdClass $c): array => [
            'id' => (string) $c->id,
            'issue_id' => (string) $c->issue_id,
            'user_id' => (string) $c->author_id,
            'author_id' => (string) $c->author_id,
            'author' => [
                'id' => (string) $c->author_id,
                'name' => (string) ($authors->get($c->author_id) ?? 'Unknown User'),
            ],
            'parent_id' => $c->parent_id,
            'body' => (string) $c->body,
            'is_edited' => (bool) $c->is_edited,
            'created_at' => $c->created_at,
            'updated_at' => $c->updated_at,
        ])->values();

        return response()->json(['data' => $data]);
    }

    public function __invoke(AddCommentHttpRequest $request, string $issueId): JsonResponse
    {
        $user = $request->user();
        $projectId = DB::table('issues')->where('id', $issueId)->value('project_id');
        if (! $user || ! $projectId || ! WorkloadAccessChecker::canViewProject($user->id, (string) $projectId)) {
            abort(403, 'Unauthorized.');
        }

        $input = new AddCommentInput(
            commentId: Str::uuid()->toString(),
            issueId: $issueId,
            authorId: (string) $request->user()->id,
            body: $request->validated('body'),
            parentId: $request->validated('parent_id')
        );

        $output = $this->useCase->execute($input);

        return response()->json([
            'message' => 'Comment added successfully.',
            'data' => [
                'id' => $output->id,
                'issue_id' => $output->issueId,
                'author_id' => $output->authorId,
                'parent_id' => $output->parentId,
                'body' => $output->body,
                'is_edited' => $output->isEdited,
                'created_at' => $output->createdAt,
                'updated_at' => $output->updatedAt,
            ],
        ], 201);
    }
}
