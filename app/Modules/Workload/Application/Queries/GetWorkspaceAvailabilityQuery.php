<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\Queries;

use Illuminate\Support\Facades\DB;

/**
 * Rekap jam tersedia tiap anggota ruang kerja, dipakai di halaman Ruang Kerja
 * agar beban tiap orang terlihat sebelum tugas ditugaskan.
 *
 * Kapasitas mingguan = kapasitas harian x 5 hari kerja.
 * Terisi = sisa estimasi (fallback estimasi awal) semua tiket terbuka yang ditugaskan ke anggota
 * di proyek mana pun dalam ruang kerja ini.
 */
final class GetWorkspaceAvailabilityQuery
{
    private const WORKING_DAYS_PER_WEEK = 5;

    private const DEFAULT_DAILY_CAPACITY_HOURS = 8.0;

    /**
     * @return array<int, array{
     *     user_id: int,
     *     name: string,
     *     email: string,
     *     role: string,
     *     daily_capacity_hours: float,
     *     weekly_capacity_hours: float,
     *     allocated_hours: float,
     *     available_hours: float,
     *     open_task_count: int
     * }>
     */
    public function execute(string $workspaceId): array
    {
        $members = DB::table('workspace_members')
            ->join('users', 'workspace_members.user_id', '=', 'users.id')
            ->where('workspace_members.workspace_id', $workspaceId)
            ->select([
                'users.id',
                'users.name',
                'users.email',
                'workspace_members.role',
                'workspace_members.daily_capacity_hours',
            ])
            ->orderBy('users.name')
            ->get();

        if ($members->isEmpty()) {
            return [];
        }

        $openByAssignee = DB::table('issues')
            ->join('projects', 'projects.id', '=', 'issues.project_id')
            ->join('statuses', 'statuses.id', '=', 'issues.status_id')
            ->where('projects.workspace_id', $workspaceId)
            ->whereNull('projects.deleted_at')
            ->whereNull('issues.deleted_at')
            ->whereNotNull('issues.assignee_id')
            ->where('statuses.category', '!=', 'DONE')
            ->groupBy('issues.assignee_id')
            ->select([
                'issues.assignee_id',
                DB::raw('COUNT(issues.id) as open_task_count'),
                DB::raw('SUM(COALESCE(issues.remaining_estimate_seconds, issues.original_estimate_seconds, 0)) as allocated_seconds'),
            ])
            ->get()
            ->keyBy(fn ($row): int => (int) $row->assignee_id);

        $result = [];
        foreach ($members as $member) {
            $userId = (int) $member->id;
            $open = $openByAssignee->get($userId);

            $dailyCapacity = (float) ($member->daily_capacity_hours ?? self::DEFAULT_DAILY_CAPACITY_HOURS);
            if ($dailyCapacity <= 0.0) {
                $dailyCapacity = self::DEFAULT_DAILY_CAPACITY_HOURS;
            }

            $weeklyCapacity = round($dailyCapacity * self::WORKING_DAYS_PER_WEEK, 1);
            $allocatedHours = round(((int) ($open->allocated_seconds ?? 0)) / 3600.0, 1);
            $availableHours = round(max(0.0, $weeklyCapacity - $allocatedHours), 1);

            $result[] = [
                'user_id' => $userId,
                'name' => (string) $member->name,
                'email' => (string) $member->email,
                'role' => (string) ($member->role ?? 'member'),
                'daily_capacity_hours' => $dailyCapacity,
                'weekly_capacity_hours' => $weeklyCapacity,
                'allocated_hours' => $allocatedHours,
                'available_hours' => $availableHours,
                'open_task_count' => (int) ($open->open_task_count ?? 0),
            ];
        }

        return $result;
    }
}
