import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { jellyfinService } from '../services/jellyfin';
import SkeletonLoader from './SkeletonLoader';

const ProtectedRoute = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                if (user) {
                    setIsAuthenticated(true);
                } else {
                    setIsAuthenticated(false);
                }
            } catch (e) {
                console.error("Auth check failed", e);
                setIsAuthenticated(false);
            }
        };
        checkAuth();
    }, []);

    if (isAuthenticated === null) {
        return (
            <div style={{ padding: '20px' }}>
                <SkeletonLoader width="100%" height="100vh" />
            </div>
        );
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login/select-user" replace />;
};

export default ProtectedRoute;
