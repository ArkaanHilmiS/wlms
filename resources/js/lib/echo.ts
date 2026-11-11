import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

if (typeof window !== 'undefined') {
    window.Pusher = Pusher;
}

export const initEcho = () => {
    if (typeof window === 'undefined') return null;

    // Check if the Reverb or Pusher key is provided in the environment
    const appKey =
        import.meta.env.VITE_REVERB_APP_KEY ||
        import.meta.env.VITE_PUSHER_APP_KEY;

    // If no key is provided, gracefully disable websockets instead of crashing
    if (!appKey) {
        console.warn(
            'WebSocket disabled: VITE_REVERB_APP_KEY or VITE_PUSHER_APP_KEY is missing.',
        );
        return null;
    }

    if (!window.Echo) {
        window.Echo = new Echo({
            broadcaster: 'reverb',
            key: appKey,
            wsHost: import.meta.env.VITE_REVERB_HOST,
            wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
            wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
            forceTLS: false,
            enabledTransports: ['ws', 'wss'],
            // Enable sanctum authorizer for private channels
            authorizer: (channel: { name: string }) => {
                return {
                    authorize: (
                        socketId: string,
                        callback: (error: Error | null, authData: any) => void,
                    ) => {
                        axios
                            .post('/broadcasting/auth', {
                                socket_id: socketId,
                                channel_name: channel.name,
                            })
                            .then((response) => {
                                callback(null, response.data);
                            })
                            .catch((error: unknown) => {
                                callback(
                                    error instanceof Error
                                        ? error
                                        : new Error(String(error)),
                                    null,
                                );
                            });
                    },
                };
            },
        });
    }

    return window.Echo;
};

// Types for window
declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: InstanceType<typeof Echo>;
        axios: typeof axios;
    }
}
