import Axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

const axios = Axios.create({
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
    },
    withCredentials: true,
});

axios.interceptors.response.use(
    (response) => response,
    (
        error: AxiosError<{
            message?: string;
            errors?: Record<string, string[]>;
        }>,
    ) => {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            // Format the error message
            let errorMessage = data?.message || error.message;

            // If it's a 422, we can optionally extract the first field error if message is generic
            if (status === 422 && data?.errors) {
                const firstKey = Object.keys(data.errors)[0];
                if (firstKey && data.errors[firstKey].length > 0) {
                    errorMessage = data.errors[firstKey][0];
                }
            }

            toast.error(`Error ${status}`, {
                description: errorMessage,
            });
        } else {
            toast.error('Network Error', {
                description: 'Unable to connect to the server.',
            });
        }

        return Promise.reject(error);
    },
);

export default axios;
