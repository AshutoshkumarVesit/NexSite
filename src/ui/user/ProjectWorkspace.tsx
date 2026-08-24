import { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, ArrowLeft, Play, FileText, Eye, MessageSquare, Settings, 
  Loader2, Layers, Globe, Palette, Database, Cpu, Terminal,
  PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2, X
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { navigate } from '../router/Router';
import { ProjectRepository } from '../../services/ProjectRepository';
import type { Project } from '../../services/ProjectRepository';
import type { PipelineState } from '../../core/entities/PipelineState';
import { compileBundle } from '../workspace/BundleCompiler';
import { LangGraphWorkflow } from '../../application/workflow/LangGraphWorkflow';
import { LLMFactory } from '../../infrastructure/llm/LLMFactory';
import { ErrorBoundary } from '../common/ErrorBoundary';

const INITIAL_STATE: PipelineState = {
  requirements: { raw_prompt: '', category: '', key_features: [] },
  ui_spec: {
    theme: { mode: 'dark', primaryColor: '#7c3aed', secondaryColor: '#6366f1', accentColor: '#ec4899', backgroundColor: '#0f172a', textColor: '#f8fafc', fontHeading: 'Inter, sans-serif', fontBody: 'Inter, sans-serif' },
    layout: { pageSections: [], navbarStyle: '', heroStyle: '', cardStyle: '', footerStyle: '' },
    components: [], animations: [],
    spacing: { sectionPadding: '', containerWidth: '', cardPadding: '', gridGap: '' },
    responsiveRules: { mobile: '', tablet: '', desktop: '' },
  },
  content: { hero: { title: '', subtitle: '', cta: '' }, about: { title: '', body: '' }, features: [], testimonials: [], footer: { copyright: '', links: [] } },
  seo: { title: '', description: '', keywords: [], canonicalUrl: '', openGraph: { title: '', description: '', type: 'website' }, twitterCard: { card: 'summary_large_image', title: '', description: '' }, structuredDataJSON: '', robotsTxt: '', sitemapXml: '', faviconMeta: '', manifestJson: '', semanticHeadings: { h1: '', h2s: [] } },
  generated_files: {},
  project_metadata: { id: '', name: '', created_at: '', current_step: 'Idle', progress_percent: 0, status: 'idle' },
  logs: [],
  errors: [],
};

const PIPELINE_MILESTONES = [
  { label: 'Requirements', targetPct: 15, icon: Terminal },
  { label: 'UI & Theme', targetPct: 30, icon: Palette },
  { label: 'Copywriting', targetPct: 45, icon: FileText },
  { label: 'SEO & Meta', targetPct: 60, icon: Globe },
  { label: 'Component Tree', targetPct: 75, icon: Layers },
  { label: 'Data Model', targetPct: 85, icon: Database },
  { label: 'Build & Assembly', targetPct: 100, icon: Cpu },
];

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [pipelineState, setPipelineState] = useState<PipelineState>(INITIAL_STATE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePanel, setActivePanel] = useState<'preview' | 'code'>('preview');
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);


  useEffect(() => {
    let isMounted = true;

    // First load from memory/local
    const p = ProjectRepository.getById(projectId);
    if (p) {
      if (user && p.ownerId !== user.id && p.ownerId !== 'guest_user' && user.role !== 'admin') {
        navigate('/dashboard');
        return;
      }
      setProject(p);
      if (p.generatedFiles && Object.keys(p.generatedFiles).length > 0) {
        setPipelineState(prev => ({ ...prev, generated_files: p.generatedFiles! }));
      }
    }

    // Then ensure freshest data from Supabase
    ProjectRepository.getByIdAsync(projectId).then(remoteProj => {
      if (!isMounted || !remoteProj) return;
      setProject(remoteProj);
      if (remoteProj.generatedFiles && Object.keys(remoteProj.generatedFiles).length > 0) {
        setPipelineState(prev => ({ ...prev, generated_files: remoteProj.generatedFiles! }));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [projectId, user]);

  const handleGenerate = async () => {
    if (!project || isGenerating) return;
    setIsGenerating(true);
    ProjectRepository.update(project.id, { status: 'generating' });
    setProject(prev => prev ? { ...prev, status: 'generating' } : prev);

    const initial: PipelineState = {
      ...INITIAL_STATE,
      requirements: { ...INITIAL_STATE.requirements, raw_prompt: project.prompt },
      project_metadata: { 
        ...INITIAL_STATE.project_metadata, 
        id: project.id, 
        name: project.name, 
        created_at: project.createdAt, 
        status: 'running', 
        current_step: 'Starting generation pipeline...',
        progress_percent: 5
      },
      logs: [{ timestamp: new Date().toISOString(), agentName: 'System', message: 'Starting generation pipeline...', level: 'info' }],
    };
    setPipelineState(initial);

    try {
      const llmProvider = LLMFactory.getProvider('remote');
      const workflow = new LangGraphWorkflow(llmProvider);
      
      const finalState = await workflow.run(
        initial, 
        (updated) => {
          setPipelineState(updated);
        }, 
        { runMVPIntegrator: true }
      );

      // Save generated files and ready status directly to repository and Supabase
      ProjectRepository.update(project.id, { 
        status: 'ready', 
        generatedFiles: finalState.generated_files 
      });

      setProject(prev => prev ? { 
        ...prev, 
        status: 'ready', 
        generatedFiles: finalState.generated_files 
      } : prev);
      
      setPipelineState(finalState);
    } catch (err: any) {
      console.error('Generation error:', err);
      ProjectRepository.update(project.id, { status: 'failed' });
      setProject(prev => prev ? { ...prev, status: 'failed' } : prev);
    } finally {
      setIsGenerating(false);
    }
  };

  // Bundle for preview
  const previewHtml = useMemo(() => {
    const files = pipelineState.generated_files;
    if (!files || Object.keys(files).length === 0) return '';
    const result = compileBundle(files);
    if (!result.success) {
      return `<html><body style="background:#0f172a;color:#f87171;padding:2rem;font-family:monospace"><h2>Bundle Error</h2><pre>${result.diagnostics.map(d => d.message).join('\n')}</pre></body></html>`;
    }
    return result.srcdoc || '';
  }, [pipelineState.generated_files]);

  if (!project) return null;

  const currentStep = pipelineState.project_metadata?.current_step || 'Idle';
  const progressPercent = Math.min(100, Math.max(0, pipelineState.project_metadata?.progress_percent || 0));
  const remainingPercent = 100 - progressPercent;
  const showGeneratingView = isGenerating || project.status === 'generating';

  return (
    <div className="nex-app-shell">
      {/* Top bar */}
      <header className="nex-topnav">
        <div className="nex-topnav-left">
          <a href="#/" className="nex-logo-row" title="Go to NexSite Home" style={{ marginRight: '8px' }}>
            <Sparkles size={18} className="nex-logo-icon" />
            <span className="nex-logo-text-sm">NexSite</span>
          </a>
          <button className="nex-btn-ghost nex-btn-sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} /> Back
          </button>
          <span className="nex-project-title">{project.name}</span>
        </div>

        {/* Center View & Panel Controls */}
        <div className="nex-topnav-center">
          <div className="nex-view-toggles">
            <button 
              className={`nex-view-toggle-btn ${showLeftSidebar && !isFullscreenPreview ? 'active' : ''}`}
              onClick={() => {
                if (isFullscreenPreview) setIsFullscreenPreview(false);
                setShowLeftSidebar(v => !v);
              }}
              title={showLeftSidebar ? "Hide left panel" : "Show left panel"}
            >
              {showLeftSidebar && !isFullscreenPreview ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
              <span className="nex-toggle-label">{showLeftSidebar && !isFullscreenPreview ? 'Hide Panel' : 'Show Panel'}</span>
            </button>

            <button 
              className={`nex-view-toggle-btn ${showRightSidebar && !isFullscreenPreview ? 'active' : ''}`}
              onClick={() => {
                if (isFullscreenPreview) setIsFullscreenPreview(false);
                setShowRightSidebar(v => !v);
              }}
              title={showRightSidebar ? "Hide assistant" : "Show assistant"}
            >
              <MessageSquare size={14} />
              <span className="nex-toggle-label">Assistant</span>
            </button>

            <button 
              className={`nex-view-toggle-btn ${isFullscreenPreview ? 'active highlight' : ''}`}
              onClick={() => setIsFullscreenPreview(v => !v)}
              title={isFullscreenPreview ? "Exit full preview" : "Full preview mode"}
            >
              {isFullscreenPreview ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span className="nex-toggle-label">{isFullscreenPreview ? 'Exit Focus' : 'Full Preview'}</span>
            </button>
          </div>
        </div>

        <div className="nex-topnav-right">
          {project.status === 'draft' && !isGenerating && (
            <button className="nex-btn-primary nex-btn-sm" onClick={handleGenerate}>
              <Play size={14} /> Generate Website
            </button>
          )}
          {showGeneratingView && (
            <span className="nex-status-badge generating">
              <Loader2 size={13} className="animate-spin" style={{ display: 'inline', marginRight: 4 }} />
              Generating… {progressPercent}%
            </span>
          )}
          {project.status === 'ready' && !isGenerating && (
            <button className="nex-btn-ghost nex-btn-sm" onClick={handleGenerate} title="Regenerate website with current prompt">
              <Play size={14} /> Regenerate
            </button>
          )}
          {project.status === 'ready' && (
            <span className="nex-status-badge ready">✓ Ready</span>
          )}
          {project.status === 'failed' && !isGenerating && (
            <button className="nex-btn-primary nex-btn-sm" onClick={handleGenerate}>
              Retry Generation
            </button>
          )}
        </div>
      </header>

      <div className="nex-workspace-layout">
        {/* Left sidebar */}
        <aside className={`nex-workspace-sidebar ${!showLeftSidebar || isFullscreenPreview ? 'collapsed' : ''}`}>
          <div className="nex-sidebar-header-row">
            <span className="nex-sidebar-title">Workspace</span>
            <button 
              className="nex-sidebar-collapse-icon-btn" 
              onClick={() => setShowLeftSidebar(false)}
              title="Collapse sidebar"
            >
              <PanelLeftClose size={14} />
            </button>
          </div>
          <div className="nex-sidebar-section">
            <h4>Project</h4>
            <p className="nex-sidebar-prompt">{project.prompt}</p>
          </div>
          <div className="nex-sidebar-section">
            <h4>Pages</h4>
            <div className="nex-sidebar-item active"><FileText size={14} /> Home</div>
            <div className="nex-sidebar-item disabled">About</div>
            <div className="nex-sidebar-item disabled">Contact</div>
          </div>
          <div className="nex-sidebar-section">
            <h4>Panels</h4>
            <button className={`nex-sidebar-item ${activePanel === 'preview' ? 'active' : ''}`} onClick={() => setActivePanel('preview')}>
              <Eye size={14} /> Preview
            </button>
            <button className={`nex-sidebar-item ${activePanel === 'code' ? 'active' : ''}`} onClick={() => setActivePanel('code')}>
              <FileText size={14} /> Code ({Object.keys(pipelineState.generated_files).length})
            </button>
          </div>
          <div className="nex-sidebar-section">
            <div className="nex-sidebar-item disabled"><Settings size={14} /> Settings</div>
          </div>
        </aside>

        {/* Center — Preview, Code, or Progress Bar */}
        <div className={`nex-workspace-center ${isFullscreenPreview ? 'fullscreen' : ''}`}>
          {/* Floating Expand Sidebar Button (when sidebar is hidden) */}
          {(!showLeftSidebar || isFullscreenPreview) && (
            <button 
              className="nex-floating-expand-btn left"
              onClick={() => {
                setIsFullscreenPreview(false);
                setShowLeftSidebar(true);
              }}
              title="Show left panel"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}

          {/* Floating Exit Focus Button */}
          {isFullscreenPreview && (
            <button 
              className="nex-floating-exit-focus-btn"
              onClick={() => setIsFullscreenPreview(false)}
              title="Exit full preview"
            >
              <Minimize2 size={14} />
              <span>Exit Full Preview</span>
            </button>
          )}

          <ErrorBoundary name="ProjectPreview">
            {showGeneratingView ? (
              <div className="nex-generation-progress-container">
                <div className="nex-progress-card">
                  <div className="nex-progress-header">
                    <div className="nex-progress-title-row">
                      <div className="nex-progress-icon-badge">
                        <Sparkles size={22} className="nex-pulse-glow" />
                      </div>
                      <div>
                        <h2 className="nex-progress-heading">Generating Your Website</h2>
                        <p className="nex-progress-subheading">{currentStep}</p>
                      </div>
                    </div>

                    <div className="nex-progress-stats-box">
                      <div className="nex-stat-item">
                        <span className="nex-stat-val primary">{progressPercent}%</span>
                        <span className="nex-stat-label">Completed</span>
                      </div>
                      <div className="nex-stat-divider" />
                      <div className="nex-stat-item">
                        <span className="nex-stat-val muted">{remainingPercent}%</span>
                        <span className="nex-stat-label">Remaining</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="nex-progress-track">
                    <div 
                      className="nex-progress-fill" 
                      style={{ width: `${progressPercent}%` }}
                    >
                      <div className="nex-progress-shimmer" />
                    </div>
                  </div>

                  {/* Milestones Flow */}
                  <div className="nex-milestones-grid">
                    {PIPELINE_MILESTONES.map((m, idx) => {
                      const IconComp = m.icon;
                      const isDone = progressPercent >= m.targetPct;
                      const isCurrent = progressPercent < m.targetPct && (idx === 0 || progressPercent >= PIPELINE_MILESTONES[idx - 1].targetPct);

                      return (
                        <div 
                          key={m.label} 
                          className={`nex-milestone-pill ${isDone ? 'done' : isCurrent ? 'current' : 'pending'}`}
                        >
                          <div className="nex-milestone-icon-wrap">
                            {isDone ? (
                              <Loader2 size={14} className="text-emerald-400" />
                            ) : isCurrent ? (
                              <Loader2 size={14} className="animate-spin text-purple-400" />
                            ) : (
                              <IconComp size={14} />
                            )}
                          </div>
                          <span className="nex-milestone-label">{m.label}</span>
                          <span className="nex-milestone-pct">{m.targetPct}%</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Live Activity Stream */}
                  {pipelineState.logs && pipelineState.logs.length > 0 && (
                    <div className="nex-progress-terminal">
                      <div className="nex-terminal-header">
                        <Terminal size={12} />
                        <span>AI Agent Activity Log</span>
                      </div>
                      <div className="nex-terminal-logs">
                        {pipelineState.logs.slice(-4).map((log, i) => (
                          <div key={i} className={`nex-log-line ${log.level}`}>
                            <span className="nex-log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className="nex-log-agent">[{log.agentName}]</span>
                            <span className="nex-log-msg">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : activePanel === 'preview' ? (
              previewHtml ? (
                <iframe
                  className="nex-preview-iframe"
                  srcDoc={previewHtml}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  title="Live Preview"
                />
              ) : (
                <div className="nex-empty-preview">
                  <Sparkles size={48} style={{ opacity: 0.2 }} />
                  <p>{project.status === 'draft' ? 'Click "Generate Website" to start.' : 'No code generated yet.'}</p>
                </div>
              )
            ) : (
              <div className="nex-code-panel">
                {Object.entries(pipelineState.generated_files).length === 0 ? (
                  <p className="nex-code-empty">No generated code yet. Click "Generate Website" to start.</p>
                ) : (
                  Object.entries(pipelineState.generated_files).map(([name, code]) => (
                    <details key={name} className="nex-code-file" open={name === 'App.tsx'}>
                      <summary>{name} <span className="nex-code-size">({(code.length / 1024).toFixed(1)} KB)</span></summary>
                      <pre><code>{code}</code></pre>
                    </details>
                  ))
                )}
              </div>
            )}
          </ErrorBoundary>
        </div>

        {/* Right — AI Assistant Sidebar */}
        {showRightSidebar && !isFullscreenPreview && (
          <aside className="nex-workspace-right">
            <div className="nex-right-sidebar-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={15} className="text-purple-400" />
                <span className="nex-right-sidebar-title">AI Assistant</span>
              </div>
              <button 
                className="nex-sidebar-collapse-icon-btn" 
                onClick={() => setShowRightSidebar(false)}
                title="Hide Assistant"
              >
                <X size={14} />
              </button>
            </div>
            <div className="nex-ai-chat-placeholder">
              <MessageSquare size={28} style={{ opacity: 0.35, marginBottom: '8px' }} />
              <h4>AI Assistant</h4>
              <p>Your website and all its React files are synced and backed up to Supabase database.</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
