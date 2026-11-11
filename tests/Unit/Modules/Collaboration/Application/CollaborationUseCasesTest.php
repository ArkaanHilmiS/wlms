<?php

declare(strict_types=1);

use App\Modules\Collaboration\Application\DTOs\AddCommentInput;
use App\Modules\Collaboration\Application\DTOs\AuditLogInput;
use App\Modules\Collaboration\Application\DTOs\CommentOutput;
use App\Modules\Collaboration\Application\DTOs\EditCommentInput;
use App\Modules\Collaboration\Application\UseCases\AddCommentToIssueUseCase;
use App\Modules\Collaboration\Application\UseCases\EditCommentUseCase;
use App\Modules\Collaboration\Application\UseCases\LogAuditEventUseCase;
use App\Modules\Collaboration\Domain\Entities\AuditLog;
use App\Modules\Collaboration\Domain\Entities\Comment;
use App\Modules\Collaboration\Domain\Repositories\AuditLogRepositoryInterface;
use App\Modules\Collaboration\Domain\Repositories\CommentRepositoryInterface;
use App\Modules\Collaboration\Domain\ValueObjects\CommentId;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

test('AddCommentToIssueUseCase creates and saves comment and returns CommentOutput', function () {
    $repo = Mockery::mock(CommentRepositoryInterface::class);
    $repo->shouldReceive('save')->once()->with(Mockery::on(function (Comment $comment) {
        return $comment->id->value === 'comment-1'
            && $comment->issueId === 'issue-1'
            && $comment->authorId === '42'
            && $comment->parentId === 'parent-1'
            && $comment->body->value === 'Hello World'
            && $comment->isEdited === false;
    }));

    $useCase = new AddCommentToIssueUseCase($repo);
    $output = $useCase->execute(new AddCommentInput(
        commentId: 'comment-1',
        issueId: 'issue-1',
        authorId: '42',
        body: 'Hello World',
        parentId: 'parent-1'
    ));

    expect($output)->toBeInstanceOf(CommentOutput::class)
        ->and($output->id)->toBe('comment-1')
        ->and($output->issueId)->toBe('issue-1')
        ->and($output->authorId)->toBe('42')
        ->and($output->parentId)->toBe('parent-1')
        ->and($output->body)->toBe('Hello World')
        ->and($output->isEdited)->toBeFalse();
});

test('EditCommentUseCase throws NotFoundHttpException when comment does not exist', function () {
    $repo = Mockery::mock(CommentRepositoryInterface::class);
    $repo->shouldReceive('findById')->once()->andReturnNull();

    $useCase = new EditCommentUseCase($repo);
    $input = new EditCommentInput('comment-1', '42', 'Updated body');

    expect(fn () => $useCase->execute($input))
        ->toThrow(NotFoundHttpException::class, 'Comment not found.');
});

test('EditCommentUseCase throws AccessDeniedHttpException when actor is not author', function () {
    $repo = Mockery::mock(CommentRepositoryInterface::class);
    $now = new DateTimeImmutable;
    $existing = Comment::reconstruct('comment-1', 'issue-1', '42', null, 'Initial body', false, $now, $now);

    $repo->shouldReceive('findById')->once()->with(Mockery::on(fn (CommentId $id) => $id->value === 'comment-1'))
        ->andReturn($existing);

    $useCase = new EditCommentUseCase($repo);
    $input = new EditCommentInput('comment-1', '99', 'Hijacked body');

    expect(fn () => $useCase->execute($input))
        ->toThrow(AccessDeniedHttpException::class, 'Unauthorized to edit this comment.');
});

test('EditCommentUseCase edits comment and saves when actor is author', function () {
    $repo = Mockery::mock(CommentRepositoryInterface::class);
    $now = new DateTimeImmutable;
    $existing = Comment::reconstruct('comment-1', 'issue-1', '42', null, 'Initial body', false, $now, $now);

    $repo->shouldReceive('findById')->once()->andReturn($existing);
    $repo->shouldReceive('save')->once()->with(Mockery::on(function (Comment $comment) {
        return $comment->body->value === 'Updated body' && $comment->isEdited === true;
    }));

    $useCase = new EditCommentUseCase($repo);
    $output = $useCase->execute(new EditCommentInput('comment-1', 42, 'Updated body'));

    expect($output)->toBeInstanceOf(CommentOutput::class)
        ->and($output->body)->toBe('Updated body')
        ->and($output->isEdited)->toBeTrue();
});

test('LogAuditEventUseCase creates and saves AuditLog entity', function () {
    $repo = Mockery::mock(AuditLogRepositoryInterface::class);
    $repo->shouldReceive('save')->once()->with(Mockery::on(function (AuditLog $log) {
        return $log->id->value === 'audit-1'
            && $log->actorId === 'user-1'
            && $log->target->type === 'Issue'
            && $log->target->id === 'issue-1'
            && $log->event === 'updated'
            && $log->oldValues === ['status' => 'TODO']
            && $log->newValues === ['status' => 'DONE']
            && $log->ipAddress === '127.0.0.1';
    }));

    $useCase = new LogAuditEventUseCase($repo);
    $useCase->execute(new AuditLogInput(
        auditLogId: 'audit-1',
        auditableType: 'Issue',
        auditableId: 'issue-1',
        event: 'updated',
        actorId: 'user-1',
        oldValues: ['status' => 'TODO'],
        newValues: ['status' => 'DONE'],
        ipAddress: '127.0.0.1',
        userAgent: 'Pest',
        url: 'http://localhost/issues/1'
    ));

    expect(true)->toBeTrue();
});
