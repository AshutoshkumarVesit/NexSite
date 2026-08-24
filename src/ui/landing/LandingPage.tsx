import { Sparkles, Wand2, Eye, Rocket, Cpu, Layers, Search, Smartphone, ArrowRight } from 'lucide-react';
import { BackgroundVideo } from '../common/BackgroundVideo';
import { useAuth } from '../auth/AuthContext';

export function LandingPage() {
  const { user, logout } = useAuth();
  const dashboardHref = user?.role === 'admin' ? '#/admin' : '#/dashboard';

  return (
    <div className="nex-landing">
      {/* Background Video Layer */}
      <BackgroundVideo />

      {/* Nav */}
      <nav className="nex-landing-nav">
        <a href="#/" className="nex-logo-row" title="NexSite Home">
          <Sparkles size={24} className="nex-logo-icon" />
          <span className="nex-logo-text">NexSite</span>
        </a>
        <div className="nex-landing-nav-links">
          {user ? (
            <>
              <a href={dashboardHref} className="nex-btn-primary nex-btn-sm flex items-center gap-1.5">
                Dashboard <ArrowRight size={14} />
              </a>
              <button onClick={() => logout()} className="nex-btn-ghost nex-btn-sm cursor-pointer">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <a href="#/login" className="nex-btn-ghost">Sign In</a>
              <a href="#/signup" className="nex-btn-primary nex-btn-sm">Get Started</a>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="nex-landing-hero">
        <div className="nex-landing-badge">✨ AI-Powered Website Builder</div>
        <h1 className="nex-landing-title">Build your website<br />with AI.</h1>
        <p className="nex-landing-subtitle">
          Describe your idea. NexSite's agentic pipeline turns it into a complete website — designed, coded, and ready to preview.
        </p>
        <div className="nex-landing-cta-row">
          {user ? (
            <a href={dashboardHref} className="nex-btn-primary nex-btn-lg flex items-center gap-2">
              Go to Dashboard <ArrowRight size={18} />
            </a>
          ) : (
            <>
              <a href="#/signup" className="nex-btn-primary nex-btn-lg">Start Building</a>
              <a href="#/login" className="nex-btn-outline nex-btn-lg">View Demo</a>
            </>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="nex-landing-section">
        <h2 className="nex-section-title">How it works</h2>
        <div className="nex-steps-grid">
          {[
            { icon: Wand2, step: '1', title: 'Describe', text: 'Write a natural language prompt describing the website you want.' },
            { icon: Cpu, step: '2', title: 'Generate', text: 'NexSite\'s multi-agent pipeline designs, codes, and assembles your site.' },
            { icon: Eye, step: '3', title: 'Preview', text: 'See a live, interactive preview of your generated website instantly.' },
            { icon: Rocket, step: '4', title: 'Launch', text: 'Export your files or deploy your website to the web.' },
          ].map(s => (
            <div key={s.step} className="nex-step-card">
              <div className="nex-step-number">{s.step}</div>
              <s.icon size={28} className="nex-step-icon" />
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="nex-landing-section nex-landing-section-alt">
        <h2 className="nex-section-title">Features</h2>
        <div className="nex-features-grid">
          {[
            { icon: Cpu, title: 'AI-Powered Generation', text: 'Multiple specialized AI agents collaborate to generate your website.' },
            { icon: Layers, title: 'Multi-Agent Architecture', text: 'Project Manager, UI, Content, SEO, and Integration agents work in concert.' },
            { icon: Eye, title: 'Live Preview', text: 'See your generated website rendered in real-time as you iterate.' },
            { icon: Search, title: 'SEO Generation', text: 'Automatic meta tags, structured data, and semantic headings.' },
            { icon: Smartphone, title: 'Responsive Design', text: 'Generated websites adapt to mobile, tablet, and desktop.' },
            { icon: Wand2, title: 'One-Prompt Creation', text: 'Describe what you want in plain English. No code required.' },
          ].map(f => (
            <div key={f.title} className="nex-feature-card">
              <f.icon size={24} className="nex-feature-icon" />
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="nex-landing-footer">
        <a href="#/" className="nex-logo-row" title="NexSite Home">
          <Sparkles size={18} className="nex-logo-icon" />
          <span className="nex-logo-text-sm">NexSite</span>
        </a>
        <p>© {new Date().getFullYear()} NexSite — AI Website Builder</p>
      </footer>
    </div>
  );
}
