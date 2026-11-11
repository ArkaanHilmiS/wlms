<?php

declare(strict_types=1);

namespace App\Modules\Collaboration\Presentation\Http\Controllers;

use App\Modules\Collaboration\Application\DTOs\EditCommentInput;
use App\Modules\Collaboration\Application\UseCases\EditCommentUseCase;
use App\Modules\Collaboration\Presentation\Http\Requests\EditCommentHttpRequest;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class EditCommentController extends Controller
{
    public function __construct(
        private readonly EditCommentUseCase $useCase
    ) {}

    public function __invoke(EditCommentHttpRequest $request, string $issueId, string $commentId): JsonResponse
    {
        $user = $request->user();
        $issue = DB::table('issues')
            ->where('id', $issueId)
            ->whereNull('deleted_at')
            ->first(['project_id']);

        if (! $user || ! $issue || ! WorkloadAccessChecker::canViewProject($user->id, (string) $issue->project_id)) {
            abort(403, 'Unauthorized.');
        }

        $commentRow = DB::table('comments')
            ->where('id', $commentId)
            ->first(['issue_id']);

        if ($commentRow && (string) $commentRow->issue_id !== $issueId) {
            abort(403, 'Comment does not belong to this issue.');
        }

        $input = new EditCommentInput(
            commentId: $commentId,
            authorId: (string) $request->user()->id,
            body: $request->validated('body')
        );

        $output = $this->useCase->execute($input);

        return response()->json([
            'message' => 'Comment edited successfully.',
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
        ]);
    }
}

// Nota

// apabila tidak menghadiri atau mengirimkan PIC, div. TI tidak mensuport kebutuhan use case dari divisi lain.
// Jadi, pastikan untuk menghadiri meeting atau mengirimkan PIC agar kebutuhan use case dapat didukung dengan baik.
