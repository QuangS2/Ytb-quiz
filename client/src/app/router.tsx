import React from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import Dashboard from '../pages/Dashboard';
import History from '../pages/History';
import Settings from '../pages/Settings';
import NotFound from '../pages/NotFound';
import AuthCallback from '../pages/AuthCallback';
import Login from '../pages/Login';
import QuizAttempt from '../pages/QuizAttempt';
import AuthGuard from './guards/AuthGuard';
import GuestOnlyRoute from './guards/GuestOnlyRoute';

/**
 * LayoutWrapper bridges React Router state with the AppShell component.
 * It detects the active route path and reflects it dynamically on the Sidebar links.
 */
const LayoutWrapper: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab depending on the current pathname
  let activeTab = 'dashboard';
  if (location.pathname.startsWith('/history')) {
    activeTab = 'history';
  } else if (location.pathname.startsWith('/settings')) {
    activeTab = 'settings';
  } else if (location.pathname.startsWith('/login')) {
    activeTab = 'settings'; // Treat login view under settings or neutral
  }

  const handleTabChange = (tabId: string) => {
    if (tabId === 'dashboard') {
      navigate('/');
    } else {
      navigate(`/${tabId}`);
    }
  };

  return (
    <AppShell activeTab={activeTab} onTabChange={handleTabChange}>
      <Outlet />
    </AppShell>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LayoutWrapper />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'dashboard',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'login',
        element: (
          <GuestOnlyRoute>
            <Login />
          </GuestOnlyRoute>
        ),
      },
      {
        path: 'history',
        element: (
          <AuthGuard>
            <History />
          </AuthGuard>
        ),
      },
      {
        path: 'quiz/:id',
        element: (
          <AuthGuard>
            <QuizAttempt />
          </AuthGuard>
        ),
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />,
  },
]);
