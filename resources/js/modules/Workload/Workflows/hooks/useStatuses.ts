import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import type { Status, CreateStatusDto, UpdateStatusDto } from '../types';

const API_URL = '/api/statuses';

export function useStatuses() {
    return useQuery({
        queryKey: ['statuses'],
        queryFn: async () => {
            const { data } = await axios.get<{ data: Status[] }>(API_URL);
            return (data.data ? data.data : data) as Status[];
        },
    });
}

export function useCreateStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateStatusDto) => {
            const { data } = await axios.post<{ data: Status }>(
                API_URL,
                payload,
            );
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['statuses'] });
        },
    });
}

export function useUpdateStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: UpdateStatusDto;
        }) => {
            const { data } = await axios.put<{ data: Status }>(
                `${API_URL}/${id}`,
                payload,
            );
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['statuses'] });
        },
    });
}

export function useDeleteStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`${API_URL}/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['statuses'] });
        },
    });
}
