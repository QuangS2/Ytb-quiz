import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface GuestOnlyRouteProps {
  children: React.ReactNode;
}

export const GuestOnlyRoute: React.FC<GuestOnlyRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        color: 'var(--text-primary)'
      }}>
        <Loader2 style={{ animation: 'spin 1.5s linear infinite' }} size={32} color="var(--color-primary)" />
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect back to where the user came from, or defaults to home
    const from = (location.state as any)?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};

export default GuestOnlyRoute;
