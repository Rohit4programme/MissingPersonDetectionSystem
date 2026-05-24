import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  allowedRoles?: Array<'public' | 'officer' | 'admin'>;
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  redirectPath = '/login',
}) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
