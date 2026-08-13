import { useState, Component, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { 
  Sparkles, 
  Play, 
  Terminal, 
  Code, 
  Layers, 
  CheckCircle2, 
  RefreshCw,
  Cpu,
  Palette,
  FileText,
  Search,
  Zap,
  Globe,
  Copy,
  Check,
  Sliders,
  Eye,
  AlertCircle,
  Bug
} from 'lucide-react';
import type { PipelineState, RendererDiagnostics } from '../../core/entities/PipelineState';
import { compileBundle } from './BundleCompiler';
import { LangGraphWorkflow } from '../../application/workflow/LangGraphWorkflow';
import { LLMFactory } from '../../infrastructure/llm/LLMFactory';
import type { ProviderType } from '../../infrastructure/llm/LLMFactory';


export default function NexSiteWorkspace() {
  const [prompt, setPrompt] = useState('Design a warm, ambient Italian restaurant bistro website with chef specials menu, wine pairings, and table reservations.');
  const [providerType, setProviderType] = useState<ProviderType>('remote');
  const [milestoneMode, setMilestoneMode] = useState<'m1' | 'm2' | 'mvp' | 'full'>('mvp');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'ui_spec' | 'requirements' | 'seo' | 'diagnostics' | 'debug'>('preview');
  const [activeCodeFile, setActiveCodeFile] = useState<string>('App.tsx');
  const [copied, setCopied] = useState(false);
  const [backendLogs, setBackendLogs] = useState<string[]>([]);
  const [backendHealth, setBackendHealth] = useState<'unknown' | 'healthy' | 'error'>('unknown');

  // Initial State
  const [pipelineState, setPipelineState] = useState<PipelineState>({
    requirements: {
      raw_prompt: '',
      category: 'Restaurant',
      key_features: []
    },
    ui_spec: {
      theme: {
        mode: 'dark',
        primaryColor: '#D97706',
        secondaryColor: '#B45309',
        accentColor: '#F59E0B',
        backgroundColor: '#0F172A',
        textColor: '#F8FAFC',
        fontHeading: 'Playfair Display, serif',
        fontBody: 'Inter, sans-serif'
      },
      layout: {
        pageSections: ['Navbar', 'Hero', 'Menu', 'Reservations', 'Footer'],
        navbarStyle: 'ambient-glassmorphism',
        heroStyle: 'centered-dining-hero',
        cardStyle: 'bistro-menu-card',
        footerStyle: 'warm-centered-footer'
      },
      components: ['HeaderNav', 'HeroBanner', 'MenuGrid', 'ReservationForm', 'Footer'],
      animations: ['fade-in-up', 'amber-glow-pulse'],
      spacing: {
        sectionPadding: 'py-20 px-6',
        containerWidth: 'max-w-6xl mx-auto',
        cardPadding: 'p-6',
        gridGap: 'gap-6'
      },
      responsiveRules: {
        mobile: 'flex flex-col text-center px-4',
        tablet: 'md:grid-cols-2 text-left',
        desktop: 'lg:grid-cols-3 lg:px-8'
      }
    },
    content: {
      hero: { title: '', subtitle: '', cta: '' },
      about: { title: '', body: '' },
      features: [],
      testimonials: [],
      footer: { copyright: '', links: [] }
    },
    seo: {
      title: '',
      description: '',
      keywords: [],
      canonicalUrl: '',
      openGraph: { title: '', description: '', type: 'website' },
      twitterCard: { card: 'summary_large_image', title: '', description: '' },
      structuredDataJSON: '',
      robotsTxt: '',
      sitemapXml: '',
      faviconMeta: '',
      manifestJson: '',
      semanticHeadings: { h1: '', h2s: [] }
    },
    generated_files: {},
    project_metadata: {
      id: 'nexsite-templates',
      name: 'NexSite Generator',
      created_at: new Date().toISOString(),
      current_step: 'Idle',
      status: 'idle'
    },
    logs: [],
    errors: []
  });

  // Check backend health and load initial logs on mount
  useEffect(() => {
    fetch('/health').then(r => r.ok ? setBackendHealth('healthy') : setBackendHealth('error')).catch(() => setBackendHealth('error'));

    const handleIframeMessage = (event: MessageEvent) => {
      if (!event.data) return;

      if (event.data.type === 'NEXSITE_PREVIEW_READY') {
        console.log('[PREVIEW READY] Live Preview component mounted successfully via postMessage handshake.');
        setPipelineState(prev => ({
          ...prev,
          logs: [
            ...prev.logs,
            {
              timestamp: new Date().toISOString(),
              agentName: 'LiveWebsiteRenderer',
              message: `⚡ NEXSITE_PREVIEW_READY: Live Preview component mounted successfully (${event.data.childrenCount || 1} DOM children).`,
              level: 'info'
            }
          ]
        }));
      }

      if (event.data.type === 'NEXSITE_PREVIEW_ERROR') {
        const errMsg = event.data.error || 'Unknown Preview Error';
        console.error('[PREVIEW ERROR]', errMsg);
        setPipelineState(prev => ({
          ...prev,
          logs: [
            ...prev.logs,
            {
              timestamp: new Date().toISOString(),
              agentName: 'LiveWebsiteRenderer',
              message: `❌ NEXSITE_PREVIEW_ERROR: ${errMsg}`,
              level: 'error'
            }
          ],
          errors: [...(prev.errors || []), { agentName: 'LiveWebsiteRenderer', error: errMsg, timestamp: new Date().toISOString() }]
        }));
      }

      if (event.data.type === 'IFRAME_LOG') {
        const { level, message } = event.data;
        const msgStr = typeof message === 'string' ? message : JSON.stringify(message);
        console.log(`[IFRAME ${level ? level.toUpperCase() : 'LOG'}]`, msgStr);
        setPipelineState(prev => ({
          ...prev,
          logs: [
            ...prev.logs,
            {
              timestamp: new Date().toISOString(),
              agentName: 'IframeRenderer',
              message: msgStr,
              level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info'
            }
          ],
          errors: level === 'error'
            ? [...(prev.errors || []), { agentName: 'IframeRenderer', error: msgStr, timestamp: new Date().toISOString() }]
            : prev.errors
        }));
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isGenerating) {
      intervalId = setInterval(() => {
        fetchBackendLogs();
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [isGenerating]);

  const fetchBackendLogs = async () => {
    try {
      const r = await fetch('/debug-logs');
      if (r.ok) {
        const data = await r.json();
        setBackendLogs(data.logs || []);
      }
    } catch { /* server not running, ignore */ }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setBackendLogs([]); // clear previous backend logs

    const initial: PipelineState = {
      ...pipelineState,
      requirements: {
        ...pipelineState.requirements,
        raw_prompt: prompt
      },
      project_metadata: {
        ...pipelineState.project_metadata,
        status: 'running',
        current_step: 'Executing ProjectManagerAgent Node'
      },
      logs: [
        {
          timestamp: new Date().toISOString(),
          agentName: 'System',
          message: `Initializing LangGraph workflow using ${providerType === 'remote' ? 'Backend Provider Manager (POST /generate)' : 'Local Mock Engine'}...`,
          level: 'info'
        }
      ],
      errors: []
    };

    setPipelineState(initial);

    try {
      const llmProvider = LLMFactory.getProvider(providerType);
      const workflow = new LangGraphWorkflow(llmProvider);

      await workflow.run(
        initial,
        (updatedState) => {
          setPipelineState(updatedState);
        },
        {
          runOnlyProjectManager: milestoneMode === 'm1',
          runUpToUIAgent: milestoneMode === 'm2',
          runMVPIntegrator: milestoneMode === 'mvp'
        }
      );
    } catch (err: any) {
      console.error('Pipeline error:', err);
    } finally {
      setIsGenerating(false);
      // Always fetch backend logs after generation
      await fetchBackendLogs();
      // Auto-switch to debug tab if there are errors in state
      setPipelineState(prev => {
        if (prev.errors && prev.errors.length > 0) {
          setActiveTab('debug');
        }
        return prev;
      });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stable callback for bundle diagnostics to avoid passing a new function
  // identity into `LiveWebsiteRenderer` on every render (which caused
  // its internal effect to re-run and trigger a render loop).
  const handleBundleDiagnostics = useMemo(() => {
    return (diag: RendererDiagnostics) => {
      try {
        console.debug('[PARENT:HANDLE_DIAG]', diag.bundleResult, diag.fileCount, diag.dependencyCount);
      } catch (e) {}
      setPipelineState(prev => ({
        ...prev,
        renderer_diagnostics: diag,
        logs: [
          ...prev.logs,
          {
            timestamp: new Date().toISOString(),
            agentName: 'BundleCompiler',
            message: diag.bundleResult === 'PASS'
              ? `Bundle Validation: PASS | Files: ${diag.fileCount} | Dependencies: ${diag.dependencyCount} | Order: [${diag.executionOrder.join(', ')}] | Time: ${diag.bundleTimeMs}ms`
              : `Bundle Validation: FAIL | ${diag.errors.length} error(s) | Time: ${diag.bundleTimeMs}ms`,
            level: diag.bundleResult === 'PASS' ? 'info' : 'error'
          }
        ]
      }));
    };
  }, [setPipelineState]);


  const presetsList = [
    { label: 'Restaurant', category: 'Restaurant', prompt: 'Design a warm, ambient Italian restaurant bistro website with chef specials menu, wine pairings, and table reservations.' },
    { label: 'Healthcare', category: 'Healthcare', prompt: 'Create a trustworthy healthcare clinic website with medical specialties, board-certified doctors team, and appointment booking.' },
    { label: 'Crypto Exchange', category: 'Crypto', prompt: 'Build a dark mode crypto exchange and Web3 analytics dashboard with live token market cap, node metrics, and staking pools.' },
    { label: 'Portfolio', category: 'Portfolio', prompt: 'Create a minimal developer portfolio for a senior AI engineer with selected projects, tech stack badges, and contact CTA.' },
    { label: 'Agency Studio', category: 'Agency', prompt: 'Build a bold creative studio agency website with capability pillars, case studies, and project consultation form.' },
    { label: 'E-Commerce Store', category: 'E-Commerce', prompt: 'Design a modern e-commerce storefront for minimalist mechanical keyboards with product grid, deal badges, and express shipping.' }
  ];

  const agentsList = [
    { name: 'ProjectManagerAgent', icon: Cpu, desc: 'Requirement Analysis & Category Routing', active: true },
    { name: 'UIAgent', icon: Palette, desc: 'UI UX Pro Tokens & Theme Engine', active: true },
    { name: 'ContentAgent', icon: FileText, desc: 'Copywriting & Messaging', active: true },
    { name: 'SEOAgent', icon: Search, desc: 'Search & Meta Schema', active: true },
    { name: 'ComponentPlannerAgent', icon: Layers, desc: 'React Component Architecture', active: true },
    { name: 'IntegratorAgent', icon: Zap, desc: 'Dynamic Template Engine (6 Blueprints)', active: true }
  ];

  // Helper to format full pipeline diagnostic output
  const formatPipelineDiagnostics = () => {
    const reqs = pipelineState.requirements;
    const ui = pipelineState.ui_spec;
    const template = { name: 'AI Generator', id: reqs.category, filePath: 'dynamic' };
    const hasCode = Boolean(pipelineState.generated_files['App.tsx']);
    const pmLogs = pipelineState.logs.filter(l => l.agentName === 'ProjectManagerAgent');
    const uiLogs = pipelineState.logs.filter(l => l.agentName === 'UIAgent');
    const pmFallbackUsed = pmLogs.some(l => l.message.includes('fallback') || l.level === 'warn');
    const uiFallbackUsed = uiLogs.some(l => l.message.includes('fallback') || l.level === 'warn');

    return `==============================
ProjectManagerAgent
==============================

Raw LLM Response:
${JSON.stringify({ raw_prompt: reqs.raw_prompt }, null, 2)}

Parsed JSON:
${JSON.stringify(reqs, null, 2)}

Validation Result:
Valid UserRequirements Object (Category="${reqs.category}", Tone="${reqs.tone}")

Fallback Used?: ${pmFallbackUsed ? 'true' : 'false'}

Final Requirements:
${JSON.stringify(reqs, null, 2)}


==============================
UIAgent
==============================

Raw LLM Response:
${JSON.stringify({ mode: ui.theme.mode, primaryColor: ui.theme.primaryColor, pageSections: ui.layout.pageSections }, null, 2)}

Validation Result:
Valid UISpecification Object (HexColors=Valid, Mode="${ui.theme.mode}")

Fallback Used?: ${uiFallbackUsed ? 'true' : 'false'}

Generated ui_spec:
${JSON.stringify(ui, null, 2)}


==============================
ContentAgent
==============================

Raw Output:
${JSON.stringify(pipelineState.content, null, 2)}


==============================
Component Planner Agent
==============================

Planned Components:
${pipelineState.component_plan ? JSON.stringify(pipelineState.component_plan.components, null, 2) : 'No plan generated.'}


==============================
IntegratorAgent & Rendering Layer Diagnostics
==============================

Selected template class:
${template.name} (${template.id})

Template file used:
${template.filePath}

Received Requirements:
${JSON.stringify(reqs, null, 2)}

Received ui_spec:
${JSON.stringify(ui, null, 2)}

Received content:
${JSON.stringify(pipelineState.content, null, 2)}

JSX returned by renderCode():
${hasCode ? pipelineState.generated_files['App.tsx'] : '// No JSX generated yet'}

JSX actually rendered in the preview:
<${template.name} category="${reqs.category}" mode="${ui.theme.mode}" primaryColor="${ui.theme.primaryColor}" />
`;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* Top Navigation Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-purple-200 to-pink-400 bg-clip-text text-transparent">
                NexSite
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
                Pipeline Diagnostic Studio
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">6 Category Blueprints + Full Agent Output Trace</p>
          </div>
        </div>

        {/* Top Bar Config Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={providerType}
              onChange={(e) => setProviderType(e.target.value as ProviderType)}
              className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer"
            >
              <option value="remote" className="bg-slate-900">Backend Provider Manager (POST /generate)</option>
              <option value="mock" className="bg-slate-900">Local Mock Provider</option>
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Executing Pipeline...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Run Pipeline
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Control & Agent Flow Studio */}
        <div className="w-[420px] border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
          {/* Prompt Studio Input */}
          <div className="p-4 border-b border-slate-800">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Natural Language Prompt
              </span>
              <span className="text-[10px] text-purple-400 font-mono">Select Category Below</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Enter a prompt describing your website..."
              className="w-full mt-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm text-slate-200 resize-none outline-none transition-all placeholder:text-slate-600"
            />

            {/* Category Presets Bar */}
            <div className="mt-3 space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Diagnostic Test Prompts:</div>
              <div className="grid grid-cols-2 gap-1.5">
                {presetsList.map((item) => (
                  <button
                    key={item.category}
                    onClick={() => setPrompt(item.prompt)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-purple-950 border border-slate-800 hover:border-purple-700 text-[11px] font-medium text-slate-300 hover:text-white transition-all text-left truncate cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" /> {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scope Toggle */}
            <div className="mt-3 flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" /> Workflow Mode:
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMilestoneMode('mvp')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    milestoneMode === 'mvp' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Template MVP
                </button>
                <button
                  onClick={() => setMilestoneMode('m2')}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    milestoneMode === 'm2' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  UI Spec Only
                </button>
              </div>
            </div>
          </div>

          {/* LangGraph Agent Pipeline Monitor */}
          <div className="p-4 border-b border-slate-800 flex-1 overflow-y-auto">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-pink-400" /> LangGraph Execution Nodes
            </h2>

            <div className="space-y-2">
              {agentsList.map((agent) => {
                const isCurrent = pipelineState.project_metadata.current_step.includes(agent.name) && pipelineState.project_metadata.status !== 'completed';
                const isCompleted = pipelineState.logs.some(l => l.agentName === agent.name && l.level === 'info');
                const IconComponent = agent.icon;

                return (
                  <div
                    key={agent.name}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isCurrent
                        ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-950/40'
                        : isCompleted
                        ? 'bg-slate-900 border-slate-800 opacity-90'
                        : 'bg-slate-950/50 border-slate-900 opacity-40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isCurrent ? 'bg-purple-600 text-white animate-bounce' : isCompleted ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-500'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          {agent.name}
                        </div>
                        <p className="text-[11px] text-slate-400">{agent.desc}</p>
                      </div>
                    </div>

                    <div>
                      {isCurrent && <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />}
                      {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Execution Log Stream */}
            <div className="mt-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-purple-400" /> Pipeline Terminal Logs
              </h3>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] h-40 overflow-y-auto space-y-1.5">
                {pipelineState.logs.length === 0 ? (
                  <div className="text-slate-600 italic">Select a prompt and click "Run Pipeline"...</div>
                ) : (
                  pipelineState.logs.map((log, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-slate-600">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
                      <span className="text-purple-400 font-semibold">{log.agentName}:</span>
                      <span className={log.level === 'error' ? 'text-rose-400' : log.level === 'warn' ? 'text-amber-300' : 'text-slate-300'}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Output Stage */}
        <div className="flex-1 flex flex-col bg-slate-950">
          {/* Workspace Tabs */}
          <div className="h-12 border-b border-slate-800 bg-slate-900/60 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'preview' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Live Preview Canvas
              </button>
              <button
                onClick={() => setActiveTab('diagnostics')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'diagnostics' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bug className="w-3.5 h-3.5 text-amber-300" /> Complete Pipeline Diagnostic Trace
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'code' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" /> Generated Code
              </button>
              <button
                onClick={() => setActiveTab('ui_spec')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'ui_spec' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" /> UI Spec (M2)
              </button>
              <button
                onClick={() => setActiveTab('requirements')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'requirements' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" /> Requirements (M1)
              </button>
              <button
                onClick={() => setActiveTab('seo')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'seo' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" /> SEO (M4)
              </button>
              <button
                onClick={() => { setActiveTab('debug'); fetchBackendLogs(); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer relative ${
                  activeTab === 'debug' ? 'bg-rose-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" /> Debug Console
                {pipelineState.errors.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">{pipelineState.errors.length}</span>
                )}
              </button>
            </div>

            {/* Actions */}
            {(activeTab === 'code' || activeTab === 'diagnostics') && (
              <button
                onClick={() => handleCopy(activeTab === 'diagnostics' ? formatPipelineDiagnostics() : (pipelineState.generated_files[activeCodeFile] || ''))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : activeTab === 'diagnostics' ? 'Copy Trace' : 'Copy Code'}
              </button>
            )}
          </div>

          {/* Tab Content Display */}
          <div className="flex-1 overflow-auto relative">
            {activeTab === 'preview' && (
              <div className="w-full h-full p-4 flex flex-col">
                {Object.keys(pipelineState.generated_files).length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                    <div className="w-16 h-16 rounded-2xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400 mb-4 shadow-xl">
                      <Sparkles className="w-8 h-8 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Multi-Category Template Engine Live Preview</h3>
                    <p className="text-slate-400 text-sm max-w-md mb-6">
                      Select a category prompt on the left and click <strong>"Run Pipeline"</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl flex flex-col">
                    {/* Simulated Browser Bar */}
                    <div className="h-9 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                      </div>
                      <div className="px-4 py-0.5 rounded-md bg-slate-950 text-xs font-mono text-slate-400 border border-slate-800 flex items-center gap-2">
                        <span className="text-emerald-400">https://</span>nexsite.preview/{pipelineState.requirements.category.toLowerCase()}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 uppercase">
                        {pipelineState.generated_files['App.tsx'] ? '⚡ AI GENERATED WEBSITE' : '⌛ Awaiting generation...'}
                      </div>
                    </div>

                    {/* Rendered Live Website Canvas with Error Boundary */}
                    <div className="flex-1 overflow-auto bg-slate-950">
                      <PreviewErrorBoundary state={pipelineState}>
                        <LiveWebsiteRenderer
                          state={pipelineState}
                          onBundleDiagnostics={handleBundleDiagnostics}
                        />
                      </PreviewErrorBoundary>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'diagnostics' && (
              <div className="p-4 h-full bg-slate-950 font-mono text-xs overflow-auto">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300 leading-relaxed overflow-x-auto whitespace-pre">
                  {formatPipelineDiagnostics()}
                </div>
              </div>
            )}

            {activeTab === 'debug' && (
              <div className="p-4 h-full bg-slate-950 font-mono text-xs overflow-auto space-y-4">
                {/* Backend Health & Config */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className={`w-2.5 h-2.5 rounded-full ${ backendHealth === 'healthy' ? 'bg-emerald-400' : backendHealth === 'error' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                  <span className="text-slate-300 font-semibold">Backend: {backendHealth === 'healthy' ? '✅ Online' : backendHealth === 'error' ? '❌ Unreachable' : '⏳ Checking...'}</span>
                  <div className="ml-auto flex gap-2">
                    <a href="/health" target="_blank" className="px-2 py-1 rounded bg-slate-800 text-emerald-400 hover:bg-slate-700 text-[10px]">GET /health</a>
                    <a href="/providers" target="_blank" className="px-2 py-1 rounded bg-slate-800 text-blue-400 hover:bg-slate-700 text-[10px]">GET /providers</a>
                    <a href="/models" target="_blank" className="px-2 py-1 rounded bg-slate-800 text-purple-400 hover:bg-slate-700 text-[10px]">GET /models</a>
                    <button onClick={fetchBackendLogs} className="px-2 py-1 rounded bg-slate-800 text-amber-400 hover:bg-slate-700 text-[10px] cursor-pointer">↻ Refresh Logs</button>
                  </div>
                </div>

                {/* Pipeline Metrics */}
                {pipelineState.metrics && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-purple-400 font-bold mb-2 text-[11px] uppercase tracking-wider">📊 Generation Metrics</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div><div className="text-slate-500 text-[10px] uppercase">Integrator Time</div><div className="text-emerald-300 font-bold">{(pipelineState.metrics.generationTimeMs / 1000).toFixed(2)}s</div></div>
                      <div><div className="text-slate-500 text-[10px] uppercase">Parallel Efficiency</div><div className="text-emerald-400 font-bold">{pipelineState.metrics.parallelEfficiency ?? 100}%</div></div>
                      <div><div className="text-slate-500 text-[10px] uppercase">Planner Time</div><div className="text-purple-300 font-bold">{pipelineState.metrics.plannerDurationMs ? `${(pipelineState.metrics.plannerDurationMs / 1000).toFixed(2)}s` : 'N/A'}</div></div>
                      <div><div className="text-slate-500 text-[10px] uppercase">DataModel Time</div><div className="text-indigo-300 font-bold">{pipelineState.metrics.dataModelDurationMs ? `${(pipelineState.metrics.dataModelDurationMs / 1000).toFixed(2)}s` : 'N/A'}</div></div>
                      <div><div className="text-slate-500 text-[10px] uppercase">Components</div><div className="text-blue-300 font-bold">{pipelineState.metrics.componentCount}</div></div>
                      <div><div className="text-slate-500 text-[10px] uppercase">Cache Hits</div><div className="text-teal-300 font-bold">{pipelineState.metrics.cacheHits} / {pipelineState.metrics.componentCount}</div></div>
                      <div><div className="text-slate-500 text-[10px] uppercase">Repairs</div><div className="text-amber-300 font-bold">{pipelineState.metrics.repairCount}</div></div>
                      <div><div className="text-slate-500 text-[10px] uppercase">Validation Errs</div><div className="text-rose-300 font-bold">{pipelineState.metrics.validationErrors}</div></div>
                    </div>
                  </div>
                )}

                {/* Component Diagnostics */}
                {pipelineState.component_diagnostics && pipelineState.component_diagnostics.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-teal-400 font-bold mb-2 text-[11px] uppercase tracking-wider">🔬 Component Diagnostics ({pipelineState.component_diagnostics.length})</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px] text-slate-300">
                        <thead className="text-slate-500 uppercase bg-slate-950/50">
                          <tr>
                            <th className="px-2 py-1.5 font-medium rounded-tl-lg">Component</th>
                            <th className="px-2 py-1.5 font-medium">Provider</th>
                            <th className="px-2 py-1.5 font-medium">Time</th>
                            <th className="px-2 py-1.5 font-medium">Response Format</th>
                            <th className="px-2 py-1.5 font-medium">Validation</th>
                            <th className="px-2 py-1.5 font-medium">Repairs</th>
                            <th className="px-2 py-1.5 font-medium">Size</th>
                            <th className="px-2 py-1.5 font-medium rounded-tr-lg">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {pipelineState.component_diagnostics.map((diag, i) => (
                            <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-2 py-2 font-mono text-purple-300">{diag.component}</td>
                              <td className="px-2 py-2">{diag.provider}</td>
                              <td className="px-2 py-2 font-mono text-emerald-400">{diag.generationTimeMs ? `${(diag.generationTimeMs / 1000).toFixed(1)}s` : '0s'}</td>
                              <td className="px-2 py-2 font-mono text-amber-200/80">{diag.rawResponseType}</td>
                              <td className="px-2 py-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${diag.validation === 'pass' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>{diag.validation.toUpperCase()}</span>
                              </td>
                              <td className="px-2 py-2 font-mono">{diag.repairCount}</td>
                              <td className="px-2 py-2 font-mono">{(diag.finalSize / 1024).toFixed(1)}kb</td>
                              <td className="px-2 py-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${diag.status === 'success' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>{diag.status.toUpperCase()}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Pipeline Errors */}
                {pipelineState.errors.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800">
                    <div className="text-rose-400 font-bold mb-2 text-[11px] uppercase tracking-wider">⛔ Pipeline Errors ({pipelineState.errors.length})</div>
                    {pipelineState.errors.map((e, i) => (
                      <div key={i} className="mb-2 p-2 bg-rose-950/60 rounded-lg border border-rose-900">
                        <span className="text-rose-300 font-semibold">[{e.agentName}]</span>{' '}
                        <span className="text-rose-200 whitespace-pre-wrap">{e.error}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pipeline Logs */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-slate-400 font-bold mb-2 text-[11px] uppercase tracking-wider">📋 Pipeline Agent Logs ({pipelineState.logs.length})</div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {pipelineState.logs.length === 0 ? <div className="text-slate-600 italic">No pipeline logs yet. Run the pipeline first.</div> : pipelineState.logs.map((log, i) => (
                      <div key={i} className={`flex gap-2 ${ log.level === 'error' ? 'text-rose-400' : log.level === 'warn' ? 'text-amber-300' : 'text-slate-300'}`}>
                        <span className="text-slate-600 shrink-0">[{log.timestamp.split('T')[1]?.split('.')[0]}]</span>
                        <span className="text-purple-400 shrink-0">{log.agentName}:</span>
                        <span className="break-all">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Backend Server Logs */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-slate-400 font-bold mb-2 text-[11px] uppercase tracking-wider">🖥 Backend Server Logs ({backendLogs.length})</div>
                  <div className="space-y-0.5 max-h-80 overflow-y-auto">
                    {backendLogs.length === 0 ? (
                      <div className="text-slate-600 italic">No backend logs captured. Click "↻ Refresh Logs" after running the pipeline.</div>
                    ) : backendLogs.map((line, i) => (
                      <div key={i} className={`break-all leading-relaxed ${
                        line.includes('[ERROR]') ? 'text-rose-400' : line.includes('[WARN]') ? 'text-amber-300' : line.includes('✅') ? 'text-emerald-400' : line.includes('❌') ? 'text-rose-400' : 'text-slate-400'
                      }`}>{line}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'code' && (
              <div className="flex h-full">
                {/* Code Files List */}
                <div className="w-48 border-r border-slate-800 bg-slate-900/40 p-3 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                    Generated Files
                  </div>
                  {Object.keys(pipelineState.generated_files).length === 0 ? (
                    <div className="text-xs text-slate-600 p-2 italic">No files generated yet</div>
                  ) : (
                    Object.keys(pipelineState.generated_files).map(filename => (
                      <button
                        key={filename}
                        onClick={() => setActiveCodeFile(filename)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                          activeCodeFile === filename ? 'bg-purple-900/50 text-purple-300 border border-purple-700/50' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {filename}
                      </button>
                    ))
                  )}
                </div>

                {/* Code Content Editor View */}
                <div className="flex-1 bg-slate-950 p-4 font-mono text-xs overflow-auto">
                  <pre className="text-purple-200 leading-relaxed">
                    {pipelineState.generated_files[activeCodeFile] || '// Select a generated file to inspect source code.'}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'ui_spec' && (
              <div className="max-w-4xl mx-auto space-y-4 font-mono text-xs p-4">
                <h3 className="text-sm font-bold text-purple-400 font-sans">Generated UISpecification</h3>
                <pre className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 overflow-x-auto">
                  {JSON.stringify(pipelineState.ui_spec, null, 2)}
                </pre>
              </div>
            )}

            {activeTab === 'requirements' && (
              <div className="max-w-4xl mx-auto space-y-4 font-mono text-xs p-4">
                <h3 className="text-sm font-bold text-purple-400 font-sans">Parsed User Requirements</h3>
                <pre className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 overflow-x-auto">
                  {JSON.stringify(pipelineState.requirements, null, 2)}
                </pre>
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="max-w-4xl mx-auto space-y-4 p-4">
                <h3 className="text-sm font-bold text-purple-400 font-sans">SEO Metadata (Milestone 4)</h3>

                {/* Title & Description */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-400 font-bold uppercase tracking-wider">Title Tag</span>
                    <span className="text-slate-300 font-mono">{pipelineState.seo.title || '—'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <span className="text-emerald-400 font-bold uppercase tracking-wider shrink-0">Meta Desc</span>
                    <span className="text-slate-300 font-mono">{pipelineState.seo.description || '—'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <span className="text-emerald-400 font-bold uppercase tracking-wider shrink-0">Keywords</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(pipelineState.seo.keywords || []).map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800 text-purple-300 text-[10px] font-mono">{kw}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-400 font-bold uppercase tracking-wider">Canonical</span>
                    <span className="text-blue-400 font-mono underline">{pipelineState.seo.canonicalUrl || '—'}</span>
                  </div>
                </div>

                {/* OpenGraph & Twitter */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">OpenGraph</div>
                    <pre className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap">{JSON.stringify(pipelineState.seo.openGraph, null, 2)}</pre>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="text-xs text-sky-400 font-bold uppercase tracking-wider">Twitter Card</div>
                    <pre className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap">{JSON.stringify(pipelineState.seo.twitterCard, null, 2)}</pre>
                  </div>
                </div>

                {/* JSON-LD */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-xs text-rose-400 font-bold uppercase tracking-wider">JSON-LD Structured Data</div>
                  <pre className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto">{pipelineState.seo.structuredDataJSON || '—'}</pre>
                </div>

                {/* Semantic Headings */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-xs text-violet-400 font-bold uppercase tracking-wider">Semantic Headings</div>
                  <div className="text-xs text-slate-300 font-mono">H1: {pipelineState.seo.semanticHeadings?.h1 || '—'}</div>
                  <div className="text-xs text-slate-400 font-mono">{(pipelineState.seo.semanticHeadings?.h2s || []).map((h, i) => `H2[${i}]: ${h}`).join('\n')}</div>
                </div>

                {/* robots.txt & sitemap.xml & manifest */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="text-xs text-orange-400 font-bold uppercase tracking-wider">robots.txt</div>
                    <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap">{pipelineState.seo.robotsTxt || '—'}</pre>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="text-xs text-teal-400 font-bold uppercase tracking-wider">sitemap.xml</div>
                    <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap overflow-x-auto">{pipelineState.seo.sitemapXml || '—'}</pre>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="text-xs text-pink-400 font-bold uppercase tracking-wider">manifest.json</div>
                    <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap">{pipelineState.seo.manifestJson || '—'}</pre>
                  </div>
                </div>

                {/* Favicon Meta */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Favicon Meta Tags</div>
                  <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap">{pipelineState.seo.faviconMeta || '—'}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// LiveWebsiteRenderer — renders LLM-generated code inside an iframe.
// Uses BundleCompiler for deterministic dependency resolution and validation.
// Shows a structured error panel on bundle failure instead of a blank screen.
function LiveWebsiteRenderer({ state, onBundleDiagnostics }: { state: PipelineState; onBundleDiagnostics?: (diag: RendererDiagnostics) => void }) {
  const hasFiles = Object.keys(state.generated_files).length > 0;

  // Memoize bundle compilation — only recompile when generated_files change
  const bundleResult = useMemo(() => {
    if (!hasFiles) return null;
    return compileBundle(state.generated_files);
  }, [state.generated_files]);

  useEffect(() => {
    if (bundleResult && onBundleDiagnostics) {
      try { console.debug('[LWR:EFFECT:DIAG_CALL]', bundleResult.fileCount, bundleResult.dependencyCount); } catch(e) {}
      onBundleDiagnostics({
        bundleResult: bundleResult.success ? 'PASS' : 'FAIL',
        fileCount: bundleResult.fileCount,
        dependencyCount: bundleResult.dependencyCount,
        executionOrder: bundleResult.executionOrder,
        errors: bundleResult.diagnostics.filter(d => d.type !== 'BUNDLE_VALID').map(d => ({
          type: d.type,
          source: d.source,
          dependency: d.dependency,
          expectedFile: d.expectedFile,
          chain: d.chain,
          message: d.message,
        })),
        bundleTimeMs: 0,
      });
    }
  }, [bundleResult, onBundleDiagnostics]);

  if (!hasFiles) {
    return (
      <div className="p-8 text-center text-slate-400">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <h4 className="font-bold text-white mb-1">No Generated Code Yet</h4>
        <p className="text-xs">Run the pipeline to generate your website.</p>
      </div>
    );
  }

  if (!bundleResult) return null;

  return (
    <iframe
      srcDoc={bundleResult.srcdoc}
      className="w-full h-full border-0"
      title="Live Preview"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}


// Defensive Error Boundary to catch render exceptions
interface ErrorBoundaryProps {
  children: ReactNode;
  state: PipelineState;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PreviewErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[PreviewErrorBoundary] Runtime component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {


      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-rose-950/40 border border-rose-800/80 rounded-2xl text-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-900/80 border border-rose-700 flex items-center justify-center text-rose-300">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Live Preview Render Error</h3>
              <p className="text-xs text-rose-300 font-mono">{this.props.state.requirements.category}</p>
            </div>
          </div>
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-rose-300 mb-4 overflow-x-auto">
            {this.state.error?.message || 'Unknown render exception'}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
