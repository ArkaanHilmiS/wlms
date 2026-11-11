import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { CreateWorkspaceModal } from '../components/CreateWorkspaceModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from '@/lib/axios';

// Mock axios
vi.mock('@/lib/axios', () => {
    return {
        default: {
            post: vi.fn(),
        },
    };
});

// Mock useTranslate
vi.mock('@/hooks/useTranslate', () => ({
    useTranslate: () => ({ t: (k: string) => k, locale: 'en' }),
}));

describe('CreateWorkspaceModal Behavioral Test', () => {
    const queryClient = new QueryClient();

    const renderComponent = () => {
        return render(
            <QueryClientProvider client={queryClient}>
                <CreateWorkspaceModal>
                    <button>Open Modal</button>
                </CreateWorkspaceModal>
            </QueryClientProvider>,
        );
    };

    it('opens modal, types name, and submits successfully', async () => {
        (axios.post as any).mockResolvedValueOnce({
            data: { data: { id: 'uuid', name: 'Alpha', status: 'ACTIVE' } },
        });

        renderComponent();

        // 1. User clicks the trigger to open modal
        fireEvent.click(screen.getByText('Open Modal'));

        // Wait for modal to appear
        expect(await screen.findByText('Create Workspace')).toBeInTheDocument();

        // 2. User types in the input field
        const input = screen.getByLabelText(/Workspace Name/i);
        fireEvent.change(input, { target: { value: 'Alpha' } });
        expect(input).toHaveValue('Alpha');

        // 3. User clicks submit button
        const submitButton = screen.getByRole('button', { name: /Create/i });
        fireEvent.click(submitButton);

        // 4. Expect axios.post to be called with correct payload
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/workspaces', {
                name: 'Alpha',
            });
        });
    });
});
