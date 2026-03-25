import { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

// 30 minutes in milliseconds
const IDLE_TIMEOUT = 60 * 60 * 1000;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const idleTimerRef = useRef(null);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        // Clear session related window variables if any
        window.location.href = '/#/login';
    }, []);

    // Function to reset the idle timer
    const resetTimer = useCallback(() => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (user) {
            idleTimerRef.current = setTimeout(() => {
                console.log("Session expired due to inactivity");
                logout();
            }, IDLE_TIMEOUT);
        }
    }, [user, logout]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch (error) {
                    console.error("User data in localStorage is corrupted, clearing it:", error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
        }
        setLoading(false);
    }, []);

    // Set up activity listeners when user is logged in
    useEffect(() => {
        if (user) {
            const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];

            const handleActivity = () => resetTimer();

            // Set initial timer
            resetTimer();

            // Attach listeners
            events.forEach(event => window.addEventListener(event, handleActivity));

            return () => {
                if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
                events.forEach(event => window.removeEventListener(event, handleActivity));
            };
        }
    }, [user, resetTimer]);

    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login', { username, password });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify({ username: response.data.username, role: response.data.role }));
            setUser({ username: response.data.username, role: response.data.role });
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

