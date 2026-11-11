export interface Project {
    id: string;
    workspace_id: string;
    workflow_id?: string | null;
    lead_id?: number | string | null;
    key: string;
    name: string;
    description: string | null;
    priority_id?: string | null;
    total_issues_count?: number;
    completed_issues_count?: number;
    start_date?: string | null;
    end_date?: string | null;
    settings?: {
        enable_sprints?: boolean;
        [key: string]: unknown;
    } | null;
    created_at?: string;
    updated_at?: string;
}

export interface CreateProjectPayload {
    workspace_id: string;
    workflow_id?: string;
    priority_id?: string;
    key: string;
    name: string;
    description?: string;
}

export interface UpdateProjectPayload {
    workflow_id?: string;
    priority_id?: string;
    name?: string;
    description?: string;
}

export interface ProjectResource {
    data: Project;
}

export interface ProjectCollectionResource {
    data: Project[];
}
