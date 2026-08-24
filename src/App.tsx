import { AuthProvider, useAuth } from './ui/auth/AuthContext';
import { useRoute, ProtectedRoute, RoleGuard, LoadingScreen } from './ui/router/Router';
import { LandingPage } from './ui/landing/LandingPage';
import { LoginPage } from './ui/auth/LoginPage';
import { SignupPage } from './ui/auth/SignupPage';
import { UserDashboard } from './ui/user/UserDashboard';
import { ProjectWorkspace } from './ui/user/ProjectWorkspace';
import { AdminDashboard } from './ui/admin/AdminDashboard';
import { ErrorBoundary } from './ui/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary name="App">
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AppRouter() {
  const route = useRoute();
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  // Public routes — always accessible
  if (route === '/' || route === '') {
    return <LandingPage />;
  }

  if (route === '/login') {
    if (user) {
      window.location.hash = user.role === 'admin' ? '#/admin' : '#/dashboard';
      return null;
    }
    return <LoginPage />;
  }

  if (route === '/signup') {
    if (user) {
      window.location.hash = '#/dashboard';
      return null;
    }
    return <SignupPage />;
  }

  // Protected user routes
  if (route === '/dashboard') {
    return <ProtectedRoute><UserDashboard /></ProtectedRoute>;
  }

  if (route === '/projects/new') {
    return <ProtectedRoute><UserDashboard /></ProtectedRoute>;
  }

  if (route.startsWith('/projects/')) {
    const projectId = route.split('/projects/')[1];
    return <ProtectedRoute><ProjectWorkspace projectId={projectId} /></ProtectedRoute>;
  }

  if (route === '/settings') {
    return (
      <ProtectedRoute>
        <div className="nex-settings-placeholder">
          <h1>Settings</h1>
          <p>User settings will be available in a future release.</p>
          <a href="#/dashboard" className="nex-link">← Back to Dashboard</a>
        </div>
      </ProtectedRoute>
    );
  }

  // Admin routes
  if (route === '/admin' || route === '/admin/pipeline' || route.startsWith('/admin/')) {
    return <RoleGuard role="admin"><AdminDashboard /></RoleGuard>;
  }

  // 404
  return (
    <div className="nex-settings-placeholder">
      <h1>Page not found</h1>
      <a href="#/" className="nex-link">← Go home</a>
    </div>
  );
}
