import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api', // Backend URL
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle expired or invalid tokens automatically
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Check for 401 Unauthorized or 400 Invalid Token
        if (
            error.response &&
            (error.response.status === 401 ||
                (error.response.status === 400 && error.response.data && error.response.data.message === 'Invalid Token'))
        ) {
            // Token is expired or invalid. Clear it an redirect to login.
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Hard reload clears app state and re-runs AuthContext check
            window.location.href = '/#/login'; // Assuming hash router, or simply hard reload: window.location.reload();
        }
        return Promise.reject(error);
    }
);

export default api;
