import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

// Hash-based router — zero dependencies
function getHash(): string {
  return window.location.hash.slice(1) || '/';
}

export function useRoute(): string {
  const [route, setRoute] = useState(getHash);
  useEffect(() => {
    const handler = () => setRoute(getHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return route;
}

export function navigate(path: string) {
  window.location.hash = '#' + path;
}

// ProtectedRoute — redirects unauthenticated users to /login
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) {
    navigate('/login');
    return null;
  }
  return <>{children}</>;
}

// RoleGuard — restricts to a specific role
export function RoleGuard({ role, children }: { role: string; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) {
    navigate('/login');
    return null;
  }
  if (user.role !== role) {
    navigate('/dashboard');
    return null;
  }
  return <>{children}</>;
}

export function LoadingScreen() {
  return (
    <div className="nex-loading-screen">
      <div className="nex-loading-spinner" />
      <p>Loading…</p>
    </div>
  );
}
