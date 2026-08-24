import { useState } from 'react';
import { Sparkles, FolderOpen, BookOpen, HelpCircle, LogOut, Plus, Clock, ChevronDown } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { navigate } from '../router/Router';
import { ProjectRepository, useProjects } from '../../services/ProjectRepository';
import type { Project } from '../../services/ProjectRepository';

export function UserDashboard() {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const projects = useProjects(user?.id);

  return (
    <div className="nex-app-shell">
      {/* Top Navigation */}
      <header className="nex-topnav">
        <div className="nex-topnav-left">
          <a href="#/" className="nex-logo-row" title="Go to NexSite Home">
            <Sparkles size={20} className="nex-logo-icon" />
            <span className="nex-logo-text-sm">NexSite</span>
          </a>
          <nav className="nex-topnav-links">
            <a href="#/dashboard" className="nex-topnav-link active"><FolderOpen size={16} /> Projects</a>
            <span className="nex-topnav-link disabled"><BookOpen size={16} /> Templates</span>
            <span className="nex-topnav-link disabled"><HelpCircle size={16} /> Resources</span>
          </nav>
        </div>
        <div className="nex-topnav-right">
          <div className="nex-profile-trigger" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <div className="nex-avatar">{user?.name?.charAt(0) || 'U'}</div>
            <span className="nex-profile-name">{user?.name}</span>
            <ChevronDown size={14} />
          </div>
          {showProfileMenu && (
            <div className="nex-profile-menu" onMouseLeave={() => setShowProfileMenu(false)}>
              <div className="nex-profile-menu-header">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              <a href="#/settings" className="nex-profile-menu-item">Settings</a>
              <button className="nex-profile-menu-item" onClick={logout}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="nex-dashboard-main">
        {/* Hero prompt area */}
        <section className="nex-dash-hero">
          <h1 className="nex-dash-title">Build something amazing</h1>
          <p className="nex-dash-subtitle">Describe the website you want to create and NexSite will build it.</p>
          <div className="nex-dash-prompt-box">
            <PromptComposer userId={user?.id || ''} />
          </div>
        </section>

        {/* Recent Projects */}
        <section className="nex-dash-projects">
          <h2 className="nex-dash-section-title">
            <Clock size={18} /> Recent Projects
          </h2>
          {projects.length === 0 ? (
            <div className="nex-empty-state">
              <p>No projects yet. Create your first website above!</p>
            </div>
          ) : (
            <div className="nex-projects-grid">
              {projects.map(p => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function PromptComposer({ userId }: { userId: string }) {
  const [prompt, setPrompt] = useState('');

  const handleCreate = () => {
    if (!prompt.trim()) return;
    const project = ProjectRepository.create({
      ownerId: userId,
      name: prompt.slice(0, 50),
      prompt,
      status: 'draft',
    });
    navigate(`/projects/${project.id}`);
  };

  return (
    <>
      <textarea
        className="nex-prompt-input"
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Create a modern fitness website for a premium training studio..."
        rows={3}
      />
      <button className="nex-btn-primary" onClick={handleCreate} disabled={!prompt.trim()}>
        <Plus size={16} /> Create Website
      </button>
    </>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const statusColors: Record<string, string> = {
    draft: '#94a3b8',
    generating: '#f59e0b',
    ready: '#22c55e',
    failed: '#ef4444',
  };

  return (
    <div className="nex-project-card" onClick={() => navigate(`/projects/${project.id}`)}>
      <div className="nex-project-card-preview">
        <Sparkles size={32} style={{ opacity: 0.3 }} />
      </div>
      <div className="nex-project-card-info">
        <h3>{project.name}</h3>
        <div className="nex-project-card-meta">
          <span className="nex-status-dot" style={{ background: statusColors[project.status] || '#94a3b8' }} />
          <span>{project.status}</span>
          <span className="nex-meta-sep">·</span>
          <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
