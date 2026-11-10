export interface Workspace {
    id: string;
    name: string;
    status: 'ACTIVE' | 'ARCHIVED' | string;
    owner_group_id: string;
    ownerGroupId?: string; // Fallback
    owner_group_name?: string | null;
    owner_group_code?: string | null;
}

export interface CreateWorkspacePayload {
    name: string;
    description?: string;
    owner_group_id?: string;
}

// Wrapper DTO dari Laravel Resource biasanya ada didalam "data"
export interface WorkspaceResource {
    data: Workspace;
}

export interface WorkspaceCollectionResource {
    data: Workspace[];
}

export interface UpdateWorkspacePayload {
    name: string;
}
