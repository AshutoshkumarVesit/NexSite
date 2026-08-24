import { useState } from 'react';
import { Sparkles, LayoutDashboard, Wrench, FolderOpen, Users, Server, LogOut, Activity, Globe, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ErrorBoundary } from '../common/ErrorBoundary';
import NexSiteWorkspace from '../workspace/NexSiteWorkspace';
import { useProjects } from '../../services/ProjectRepository';

type AdminTab = 'dashboard' | 'pipeline' | 'projects' | 'users' | 'system';

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="nex-admin-shell">
      {/* Sidebar */}
      <aside className={`nex-admin-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="nex-admin-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="#/" className="nex-logo-row" title="Go to NexSite Landing Page" style={{ textDecoration: 'none' }}>
            <Sparkles size={20} className="nex-logo-icon" />
            <span className="nex-logo-text-sm">NexSite</span>
            <span className="nex-admin-badge">Admin</span>
          </a>
          <button
            type="button"
            className="nex-btn-ghost nex-btn-sm"
            style={{ padding: '4px', cursor: 'pointer' }}
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Expand Admin Sidebar" : "Collapse Admin Sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="nex-admin-nav">
          {([
            { id: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'pipeline' as const, icon: Wrench, label: 'Pipeline Studio' },
            { id: 'projects' as const, icon: FolderOpen, label: 'Projects' },
            { id: 'users' as const, icon: Users, label: 'Users' },
            { id: 'system' as const, icon: Server, label: 'System' },
          ]).map(item => (
            <button
              key={item.id}
              className={`nex-admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="nex-admin-sidebar-footer">
          <div className="nex-admin-user">
            <div className="nex-avatar-sm">{user?.name?.charAt(0) || 'A'}</div>
            <div className="nex-admin-user-info">
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
          <button className="nex-btn-ghost nex-btn-sm" onClick={logout}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="nex-admin-main">
        <ErrorBoundary name="AdminContent">
          {activeTab === 'dashboard' && <AdminOverview />}
          <div style={{ display: activeTab === 'pipeline' ? 'block' : 'none', minHeight: '100%' }}>
            <ErrorBoundary name="PipelineStudio">
              <NexSiteWorkspace />
            </ErrorBoundary>
          </div>
          {activeTab === 'projects' && <AdminProjects />}
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'system' && <AdminSystem />}
        </ErrorBoundary>
      </main>
    </div>
  );
}

function AdminOverview() {
  const projects = useProjects();
  const ready = projects.filter(p => p.status === 'ready').length;
  const failed = projects.filter(p => p.status === 'failed').length;

  return (
    <div className="nex-admin-content">
      <h1 className="nex-admin-page-title">Dashboard</h1>
      <div className="nex-metrics-grid">
        <MetricCard label="Total Projects" value={String(projects.length)} icon={FolderOpen} />
        <MetricCard label="Successful" value={String(ready)} icon={CheckCircle2} color="#22c55e" />
        <MetricCard label="Failed" value={String(failed)} icon={XCircle} color="#ef4444" />
        <MetricCard label="System Status" value="Healthy" icon={Activity} color="#22c55e" />
      </div>

      <h2 className="nex-admin-section-title">System Health</h2>
      <div className="nex-health-grid">
        {[
          { name: 'Backend Server', status: 'healthy' },
          { name: 'LLM Providers', status: 'healthy' },
          { name: 'Generation Pipeline', status: 'healthy' },
          { name: 'Live Preview', status: 'healthy' },
        ].map(s => (
          <div key={s.name} className="nex-health-item">
            <span className="nex-health-dot" style={{ background: '#22c55e' }} />
            {s.name}
          </div>
        ))}
      </div>

      <h2 className="nex-admin-section-title">Recent Activity</h2>
      <div className="nex-activity-list">
        {projects.length === 0 ? (
          <p className="nex-muted">No activity yet. (Demo data)</p>
        ) : (
          projects.slice(-5).reverse().map(p => (
            <div key={p.id} className="nex-activity-item">
              <Globe size={14} />
              <span>Project "{p.name}" — {p.status}</span>
              <span className="nex-muted">{new Date(p.updatedAt).toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color?: string }) {
  return (
    <div className="nex-metric-card">
      <Icon size={20} style={{ color: color || 'var(--primary-color)' }} />
      <div className="nex-metric-value">{value}</div>
      <div className="nex-metric-label">{label}</div>
    </div>
  );
}

function AdminProjects() {
  const projects = useProjects();
  return (
    <div className="nex-admin-content">
      <h1 className="nex-admin-page-title">All Projects</h1>
      {projects.length === 0 ? (
        <p className="nex-muted">No projects created yet.</p>
      ) : (
        <table className="nex-admin-table">
          <thead><tr><th>Name</th><th>Owner</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.ownerId}</td>
                <td><span className={`nex-status-badge ${p.status}`}>{p.status}</span></td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AdminUsers() {
  return (
    <div className="nex-admin-content">
      <h1 className="nex-admin-page-title">Users</h1>
      <table className="nex-admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
        <tbody>
          <tr><td>NexSite Admin</td><td>admin@nexsite.ai</td><td><span className="nex-status-badge admin">admin</span></td></tr>
          <tr><td>Demo User</td><td>user@nexsite.ai</td><td><span className="nex-status-badge user">user</span></td></tr>
        </tbody>
      </table>
      <p className="nex-muted" style={{ marginTop: '1rem' }}>User management will be available when connected to a database.</p>
    </div>
  );
}

function AdminSystem() {
  return (
    <div className="nex-admin-content">
      <h1 className="nex-admin-page-title">System</h1>
      <div className="nex-health-grid">
        {[
          { name: 'Backend Server', endpoint: '/health' },
          { name: 'Provider Manager', endpoint: '/providers' },
          { name: 'Model Registry', endpoint: '/models' },
          { name: 'Debug Logs', endpoint: '/debug-logs' },
        ].map(s => (
          <div key={s.name} className="nex-system-card">
            <Server size={16} />
            <strong>{s.name}</strong>
            <code>{s.endpoint}</code>
          </div>
        ))}
      </div>
      <p className="nex-muted" style={{ marginTop: '1rem' }}>
        System monitoring and provider health checks will be enhanced in a future release.
        <br />
        Frontend RBAC is for UX/access control. Backend authorization must ultimately enforce sensitive operations.
      </p>
    </div>
  );
}
