export type SprintState = 'PENDING' | 'ACTIVE' | 'COMPLETED';

export interface Sprint {
    id: string;
    project_id: string;
    name: string;
    state: SprintState;
    goal?: string;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateSprintPayload {
    project_id: string;
    name: string;
}
