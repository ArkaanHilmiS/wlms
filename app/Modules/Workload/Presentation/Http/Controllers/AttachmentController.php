<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Infrastructure\Config\WorkloadSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class AttachmentController extends Controller
{
    public function index(Request $request, string $issueId): JsonResponse
    {
        $issue = DB::table('issues')->where('id', $issueId)->first(['id', 'project_id']);
        if (! $issue) {
            abort(404, 'Issue not found.');
        }

        $userId = $request->user()?->id;
        if (! $userId || ! WorkloadAccessChecker::canViewProject($userId, (string) $issue->project_id)) {
            abort(403, 'Unauthorized.');
        }

        $attachments = DB::table('issue_attachments')
            ->leftJoin('users', 'issue_attachments.uploader_id', '=', 'users.id')
            ->where('issue_attachments.issue_id', $issueId)
            ->select([
                'issue_attachments.id',
                'issue_attachments.issue_id',
                'issue_attachments.comment_id',
                'issue_attachments.filename',
                'issue_attachments.file_size',
                'issue_attachments.mime_type',
                'issue_attachments.created_at',
                'users.name as uploader_name',
                'issue_attachments.uploader_id',
            ])
            ->orderByDesc('issue_attachments.created_at')
            ->get()
            ->map(fn ($item) => [
                'id' => (string) $item->id,
                'issue_id' => (string) $item->issue_id,
                'comment_id' => $item->comment_id ? (string) $item->comment_id : null,
                'filename' => (string) $item->filename,
                'file_size' => (int) $item->file_size,
                'mime_type' => (string) $item->mime_type,
                'created_at' => (string) $item->created_at,
                'uploader_name' => (string) ($item->uploader_name ?? 'Unknown'),
                'uploader_id' => $item->uploader_id,
                'download_url' => "/api/attachments/{$item->id}/download",
            ]);

        return response()->json(['data' => $attachments]);
    }

    public function store(Request $request, string $issueId): JsonResponse
    {
        $issue = DB::table('issues')->where('id', $issueId)->first(['id', 'project_id']);
        if (! $issue) {
            abort(404, 'Issue not found.');
        }

        $user = $request->user();
        if (! $user || ! WorkloadAccessChecker::canViewProject($user->id, (string) $issue->project_id)) {
            abort(403, 'Unauthorized.');
        }

        $settings = WorkloadSettings::all();
        $maxKb = (int) $settings['attachment_max_mb'] * 1024;

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:'.$maxKb],
            'comment_id' => ['nullable', 'string', 'uuid'],
        ]);

        $file = $request->file('file');
        if (! $file) {
            abort(422, 'File is required.');
        }

        $extension = strtolower($file->getClientOriginalExtension());
        if (! in_array($extension, $settings['attachment_allowed_extensions'], true)) {
            throw ValidationException::withMessages([
                'file' => 'Ekstensi file tidak diizinkan.',
            ]);
        }

        $originalFilename = $file->getClientOriginalName();
        $fileSize = $file->getSize();
        $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';

        $storedPath = $file->store('attachments', 'local');
        if (! is_string($storedPath)) {
            abort(500, 'Failed to store attachment.');
        }

        $attachmentId = (string) Str::uuid();
        DB::table('issue_attachments')->insert([
            'id' => $attachmentId,
            'issue_id' => $issueId,
            'comment_id' => $validated['comment_id'] ?? null,
            'uploader_id' => $user->id,
            'filename' => $originalFilename,
            'file_path' => $storedPath,
            'file_size' => $fileSize,
            'mime_type' => $mimeType,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Attachment uploaded successfully.',
            'data' => [
                'id' => $attachmentId,
                'issue_id' => $issueId,
                'comment_id' => $validated['comment_id'] ?? null,
                'filename' => $originalFilename,
                'file_size' => $fileSize,
                'mime_type' => $mimeType,
                'created_at' => now()->toDateTimeString(),
                'uploader_name' => $user->name,
                'uploader_id' => $user->id,
                'download_url' => "/api/attachments/{$attachmentId}/download",
            ],
        ], 201);
    }

    public function download(Request $request, string $attachmentId): StreamedResponse
    {
        $attachment = DB::table('issue_attachments')
            ->join('issues', 'issue_attachments.issue_id', '=', 'issues.id')
            ->where('issue_attachments.id', $attachmentId)
            ->first(['issue_attachments.*', 'issues.project_id']);

        if (! $attachment) {
            abort(404, 'Attachment not found.');
        }

        $userId = $request->user()?->id;
        if (! $userId || ! WorkloadAccessChecker::canViewProject($userId, (string) $attachment->project_id)) {
            abort(403, 'Unauthorized.');
        }

        if (! Storage::disk('local')->exists($attachment->file_path)) {
            abort(404, 'Physical attachment file missing.');
        }

        return Storage::disk('local')->download($attachment->file_path, $attachment->filename);
    }

    public function destroy(Request $request, string $attachmentId): JsonResponse
    {
        $attachment = DB::table('issue_attachments')
            ->join('issues', 'issue_attachments.issue_id', '=', 'issues.id')
            ->where('issue_attachments.id', $attachmentId)
            ->first(['issue_attachments.*', 'issues.project_id']);

        if (! $attachment) {
            abort(404, 'Attachment not found.');
        }

        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        if (! WorkloadAccessChecker::canViewProject($user->id, (string) $attachment->project_id)) {
            abort(403, 'Unauthorized.');
        }

        $isUploader = (string) $attachment->uploader_id === (string) $user->id;
        $isSuperAdmin = WorkloadAccessChecker::isSuperAdmin($user->id);

        if (! $isUploader && ! $isSuperAdmin) {
            abort(403, 'You do not have permission to delete this attachment.');
        }

        if (Storage::disk('local')->exists($attachment->file_path)) {
            Storage::disk('local')->delete($attachment->file_path);
        }

        DB::table('issue_attachments')->where('id', $attachmentId)->delete();

        return response()->json(['message' => 'Attachment deleted successfully.']);
    }
}
