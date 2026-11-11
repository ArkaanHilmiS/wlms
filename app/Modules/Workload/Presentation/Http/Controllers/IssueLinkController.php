<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Infrastructure\Config\WorkloadSettings;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueLinkModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class IssueLinkController
{
    private const TYPES = ['BLOCKS', 'IS_BLOCKED_BY', 'RELATES_TO', 'DUPLICATES'];

    private const STOPWORDS = ['dan', 'di', 'ke', 'dari', 'yang', 'untuk', 'pada', 'saat', 'tidak', 'bisa', 'the', 'and', 'for', 'with', 'dengan', 'atau', 'ini', 'itu', 'are', 'not', 'can', 'when', 'from'];

    public function similar(Request $request, string $projectId): JsonResponse
    {
        $this->authorizeProject($request, $projectId, 'issues:view');

        $title = trim((string) $request->query('title', ''));
        $tokens = self::tokenize($title);
        if (mb_strlen($title) < 4 || $tokens === []) {
            return response()->json(['data' => []]);
        }

        // shortcut: SQL LIKE candidate limit 200 + PHP Jaccard/similar_text in controller; extract to domain service + pg_trgm/FTS when project > 5,000 issues or reused outside IssueLinkController
        $key = (string) DB::table('projects')->where('id', $projectId)->value('key');
        $candidates = IssueModel::query()
            ->with('status:id,name,category')
            ->where('project_id', $projectId)
            ->when($request->query('exclude_id'), fn ($q, $id) => $q->where('id', '!=', (string) $id))
            ->where(function ($q) use ($tokens): void {
                foreach ($tokens as $t) {
                    $q->orWhereRaw("LOWER(title) LIKE ? ESCAPE '\\'", ['%'.addcslashes($t, '%_\\').'%']);
                }
            })
            ->limit(200)
            ->get();

        $threshold = WorkloadSettings::getSimilarityThreshold();
        $data = $candidates->map(fn (IssueModel $i): array => [
            'id' => $i->id,
            'key' => $key.'-'.$i->number,
            'title' => $i->title,
            'status_name' => $i->status?->name,
            'status_category' => $i->status?->category,
            'score' => self::similarityScore($title, $i->title, $tokens),
        ])->filter(fn (array $r) => $r['score'] >= $threshold)->sortByDesc('score')->take(5)->values();

        return response()->json(['data' => $data]);
    }

    public function index(Request $request, string $id): JsonResponse
    {
        $issue = IssueModel::findOrFail($id);
        $this->authorizeProject($request, (string) $issue->project_id, 'issues:view');

        $links = IssueLinkModel::query()
            ->where(fn ($q) => $q->where('source_issue_id', $id)->orWhere('target_issue_id', $id))
            ->get();

        $subtasks = IssueModel::with(['status:id,name,category', 'assignee:id,name'])
            ->where('parent_id', $id)->orderBy('number')->get()
            ->map(fn (IssueModel $s) => [...$this->issueSummary($s, $issue), 'assignee_name' => $s->assignee?->name])->all();

        return response()->json(['data' => [
            'links' => $this->linkItems($links, $id),
            'subtasks' => $subtasks,
        ]]);
    }

    public function store(Request $request, string $id): JsonResponse
    {
        $issue = IssueModel::findOrFail($id);
        $this->authorizeProject($request, (string) $issue->project_id, 'issues:manage');

        $v = $request->validate([
            'target_issue_id' => ['required', 'uuid'],
            'link_type' => ['required', 'in:'.implode(',', self::TYPES)],
        ]);

        $target = IssueModel::find($v['target_issue_id']);
        if (! $target || (string) $target->project_id !== (string) $issue->project_id) {
            throw ValidationException::withMessages(['target_issue_id' => 'Target issue tidak valid atau beda project.']);
        }
        if ($target->id === $issue->id) {
            throw ValidationException::withMessages(['target_issue_id' => 'Issue tidak boleh dihubungkan ke dirinya sendiri.']);
        }

        $exists = IssueLinkModel::query()->where(fn ($q) => $q
            ->where(fn ($a) => $a->where('source_issue_id', $id)->where('target_issue_id', $target->id))
            ->orWhere(fn ($a) => $a->where('source_issue_id', $target->id)->where('target_issue_id', $id)))
            ->exists();
        if ($exists) {
            throw ValidationException::withMessages(['target_issue_id' => 'Link antara kedua issue ini sudah ada.']);
        }

        $slug = str_replace('_', '-', strtolower($v['link_type']));
        $typeId = DB::table('issue_link_types')->where('slug', $slug)->value('id');
        if (! $typeId) {
            DB::table('issue_link_types')->insert([
                'id' => $typeId = (string) Str::uuid(),
                'name' => Str::headline($slug),
                'slug' => $slug,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $link = IssueLinkModel::create([
            'source_issue_id' => $id,
            'target_issue_id' => $target->id,
            'link_type_id' => $typeId,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $this->linkItems(collect([$link]), $id)[0]], 201);
    }

    public function destroy(Request $request, string $id, string $linkId): JsonResponse
    {
        $issue = IssueModel::findOrFail($id);
        $this->authorizeProject($request, (string) $issue->project_id, 'issues:manage');

        IssueLinkModel::query()
            ->where('id', $linkId)
            ->where(fn ($q) => $q->where('source_issue_id', $id)->orWhere('target_issue_id', $id))
            ->firstOrFail()
            ->delete();

        return response()->json(null, 204);
    }

    /** @return list<string> */
    public static function tokenize(string $text): array
    {
        $tokens = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($text), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return array_values(array_unique(array_filter(
            $tokens,
            fn (string $t) => mb_strlen($t) >= 3 && ! in_array($t, self::STOPWORDS, true),
        )));
    }

    /** @param list<string>|null $tokens */
    public static function similarityScore(string $queryTitle, string $candidateTitle, ?array $tokens = null): float
    {
        $tokens ??= self::tokenize($queryTitle);
        $other = self::tokenize($candidateTitle);
        $union = count(array_unique([...$tokens, ...$other]));
        $jaccard = $union > 0 ? count(array_intersect($tokens, $other)) / $union : 0.0;
        similar_text(mb_strtolower($queryTitle), mb_strtolower($candidateTitle), $pct);

        return round(0.6 * $jaccard + 0.4 * ($pct / 100), 2);
    }

    /**
     * @param  Collection<int, IssueLinkModel>  $links
     * @return list<array<string, mixed>>
     */
    private function linkItems($links, string $issueId): array
    {
        $types = DB::table('issue_link_types')->whereIn('id', $links->pluck('link_type_id'))->pluck('slug', 'id');
        $issues = IssueModel::with('status:id,name,category')->whereIn('id', $links->flatMap(fn ($l) => [$l->source_issue_id, $l->target_issue_id]))->get()->keyBy('id');
        $keys = DB::table('projects')->whereIn('id', $issues->pluck('project_id'))->pluck('key', 'id');

        return $links->map(function (IssueLinkModel $l) use ($issueId, $types, $issues, $keys): ?array {
            $outgoing = (string) $l->source_issue_id === $issueId;
            $other = $issues->get($outgoing ? $l->target_issue_id : $l->source_issue_id);

            return $other ? [
                'id' => $l->id,
                'link_type' => strtoupper(str_replace('-', '_', (string) $types->get($l->link_type_id))),
                'direction' => $outgoing ? 'outgoing' : 'incoming',
                'issue' => $this->issueSummary($other, null, $keys->get($other->project_id)),
            ] : null;
        })->filter()->values()->all();
    }

    /** @return array<string, mixed> */
    private function issueSummary(IssueModel $i, ?IssueModel $ctx = null, ?string $key = null): array
    {
        $key ??= (string) DB::table('projects')->where('id', $ctx?->project_id ?? $i->project_id)->value('key');

        return [
            'id' => $i->id,
            'key' => $key.'-'.$i->number,
            'title' => $i->title,
            'status_name' => $i->status?->name,
            'status_category' => $i->status?->category,
        ];
    }

    private function authorizeProject(Request $request, string $projectId, string $permission): void
    {
        /** @var UserModel|null $user */
        $user = $request->user();
        abort_unless($user, 401, 'Unauthenticated.');

        $project = DB::table('projects')->where('id', $projectId)->whereNull('deleted_at')->first(['workspace_id', 'lead_id']);
        abort_unless($project, 404, 'Project not found.');

        $workspaceId = (string) $project->workspace_id;
        $perms = $permission === 'issues:manage'
            ? ['issues:manage', 'issues:create', 'issues:edit']
            : [$permission];

        $allowed = false;
        foreach ($perms as $p) {
            if ($allowed) {
                break;
            }
            $allowed = $user->hasPermission($p)
                || $user->hasPermission($p, 'WORKSPACE', $workspaceId)
                || $user->hasPermission($p, 'PROJECT', $projectId);
        }

        abort_unless(
            $allowed && WorkloadAccessChecker::canViewProject($user->id, $projectId, $workspaceId, $project->lead_id),
            403,
            'Unauthorized.',
        );
    }
}
