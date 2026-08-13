import { useState } from 'react';
import { Terminal, FolderGit2, ArrowRight, Menu, X, Star } from 'lucide-react';
import type { ITemplateBlueprint, TemplateProps } from '../base/TemplateTypes';

export const PortfolioTemplateBlueprint: ITemplateBlueprint = {
  id: 'portfolio-showcase-v1',
  name: 'Portfolio Showcase Blueprint',
  category: 'Portfolio',
  filePath: 'src/templates/portfolio/PortfolioTemplate.tsx',
  renderComponent: ({ requirements, ui_spec, content }: TemplateProps) => {
    const theme = ui_spec.theme;
    const isDark = theme.mode === 'dark';

    const heroTitle = content?.hero?.title || `Senior AI & Distributed Systems Architect`;
    const heroSubtitle = content?.hero?.subtitle || `Building high-throughput cloud infrastructure, multi-agent LLM systems, and real-time streaming architectures.`;
    const ctaText = content?.hero?.cta || 'Explore Featured Work';
    const aboutTitle = content?.about?.title || 'Engineering Philosophy';
    const aboutBody = content?.about?.body || 'Focused on clean architecture, sub-millisecond latency, minimal dependencies, and resilient system design.';

    const projectItems = content?.features && content.features.length > 0
      ? content.features
      : [
          { title: 'Distributed Event Streaming Platform', description: 'Go and Kafka message broker processing 50k+ events/sec with sub-millisecond latency.' },
          { title: 'Autonomous Multi-Agent Engine', description: 'LangGraph workflow engine generating production-ready React layouts.' },
          { title: 'Fintech Real-Time Analytics', description: 'High-frequency financial metrics dashboard built with TypeScript & Node.' }
        ];

    const testimonials = content?.testimonials && content.testimonials.length > 0
      ? content.testimonials
      : [{ name: 'Elena Rostova', role: 'VP of Engineering', quote: 'Architected our event streaming pipeline with zero downtime.' }];

    const copyright = content?.footer?.copyright || `© 2026 Senior Architecture Showcase. Built with Clean Code.`;
    const navLinks = content?.footer?.links && content.footer.links.length > 0 ? content.footer.links : ['Home', 'Projects', 'Experience', 'Skills', 'Contact'];

    return (
      <PortfolioLiveView
        theme={theme}
        isDark={isDark}
        category={requirements.category}
        heroTitle={heroTitle}
        heroSubtitle={heroSubtitle}
        ctaText={ctaText}
        aboutTitle={aboutTitle}
        aboutBody={aboutBody}
        projectItems={projectItems}
        testimonials={testimonials}
        copyright={copyright}
        navLinks={navLinks}
      />
    );
  },
  renderCode: ({ requirements, ui_spec, content }: TemplateProps): string => {
    const theme = ui_spec.theme;
    const isDark = theme.mode === 'dark';

    const heroTitle = content?.hero?.title || `Senior AI & Distributed Systems Architect`;
    const heroSubtitle = content?.hero?.subtitle || `Building high-throughput cloud infrastructure, multi-agent LLM systems, and real-time streaming architectures.`;
    const ctaText = content?.hero?.cta || 'Explore Featured Work';

    return `import React, { useState } from 'react';
import { Terminal, FolderGit2, ArrowRight, Menu, X } from 'lucide-react';

export default function PortfolioWebsite() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen font-mono antialiased p-4" style={{ backgroundColor: "${theme.backgroundColor}", color: "${theme.textColor}", fontFamily: "${theme.fontBody}" }}>
      {/* Portfolio Terminal Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b rounded-xl px-6 py-3.5 mb-8 flex items-center justify-between" style={{ borderColor: "${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}", backgroundColor: "${isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)'}" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-mono font-bold" style={{ backgroundColor: "${theme.primaryColor}" }}>
            &lt;/&gt;
          </div>
          <span className="font-bold text-base tracking-tight" style={{ fontFamily: "${theme.fontHeading}" }}>
            ${requirements.category} Showcase
          </span>
        </div>
      </header>

      {/* Developer Hero */}
      <section id="home" className="pt-12 pb-16 max-w-6xl mx-auto px-4">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold mb-6 border" style={{ backgroundColor: "${theme.primaryColor}15", borderColor: "${theme.primaryColor}40", color: "${theme.primaryColor}" }}>
            <Terminal className="w-3.5 h-3.5" /> SENIOR SOFTWARE ARCHITECT
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6" style={{ fontFamily: "${theme.fontHeading}" }}>
            ${heroTitle}
          </h1>
          <p className="text-lg opacity-80 leading-relaxed mb-8">
            ${heroSubtitle}
          </p>
          <a href="#projects" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg" style={{ backgroundColor: "${theme.primaryColor}" }}>
            ${ctaText} <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    </div>
  );
}
`;
  }
};

function PortfolioLiveView({ theme, isDark, category, heroTitle, heroSubtitle, ctaText, aboutTitle, aboutBody, projectItems, testimonials, copyright, navLinks }: any) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div 
      className="min-h-screen font-sans antialiased transition-colors duration-300 p-4"
      style={{ 
        backgroundColor: theme.backgroundColor, 
        color: theme.textColor,
        fontFamily: theme.fontBody
      }}
    >
      <header className="sticky top-0 z-50 backdrop-blur-md border-b rounded-xl px-6 py-3.5 mb-8 flex items-center justify-between" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', backgroundColor: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-mono font-bold" style={{ backgroundColor: theme.primaryColor }}>
            &lt;/&gt;
          </div>
          <span className="font-bold text-base tracking-tight" style={{ fontFamily: theme.fontHeading }}>
            {category} Showcase
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium opacity-80 font-mono">
          {navLinks.map((link: string, idx: number) => (
            <a key={idx} href={`#${link.toLowerCase()}`} className="hover:opacity-100 transition-opacity">{link}</a>
          ))}
        </nav>

        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 opacity-80">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      <section id="home" className="pt-12 pb-16 max-w-6xl mx-auto px-4">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold mb-6 border" style={{ backgroundColor: theme.primaryColor + '15', borderColor: theme.primaryColor + '40', color: theme.primaryColor }}>
            <Terminal className="w-3.5 h-3.5" /> SENIOR SOFTWARE ARCHITECT
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6" style={{ fontFamily: theme.fontHeading }}>
            {heroTitle}
          </h1>
          <p className="text-lg opacity-80 leading-relaxed mb-8">
            {heroSubtitle}
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="#projects" className="px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg flex items-center gap-2 transition-transform hover:scale-105 font-mono" style={{ backgroundColor: theme.primaryColor }}>
              {ctaText} <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* AI-Generated About Section */}
      <section id="about" className="py-12 border-t max-w-6xl mx-auto px-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
        <h2 className="text-xl font-bold mb-3 font-mono" style={{ color: theme.primaryColor }}>// {aboutTitle}</h2>
        <p className="opacity-80 text-sm leading-relaxed max-w-3xl font-mono">{aboutBody}</p>
      </section>

      {/* AI-Generated Projects / Features */}
      <section id="projects" className="py-16 border-t max-w-6xl mx-auto px-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-2" style={{ fontFamily: theme.fontHeading }}>
          <FolderGit2 className="w-6 h-6" style={{ color: theme.primaryColor }} /> Featured Engineering Projects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projectItems.map((item: any, idx: number) => (
            <div key={idx} className="p-6 rounded-2xl border flex flex-col justify-between transition-transform hover:-translate-y-1" style={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
              <div>
                <h3 className="text-lg font-bold mb-2 font-mono" style={{ fontFamily: theme.fontHeading }}>{item.title}</h3>
                <p className="opacity-75 text-xs leading-relaxed mb-4">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section id="testimonials" className="py-12 border-t max-w-6xl mx-auto px-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
          <div className="p-6 rounded-2xl border bg-slate-900/40 border-slate-800 font-mono">
            <div className="flex items-center gap-1 mb-2 text-indigo-400"><Star className="w-3.5 h-3.5 fill-indigo-400" /><Star className="w-3.5 h-3.5 fill-indigo-400" /><Star className="w-3.5 h-3.5 fill-indigo-400" /></div>
            <p className="italic text-xs opacity-90 mb-2">"{testimonials[0].quote}"</p>
            <div className="text-[11px] font-bold text-white">{testimonials[0].name} — <span className="opacity-60">{testimonials[0].role}</span></div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="pt-8 pb-4 border-t font-mono text-xs opacity-60 text-center" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
        {copyright}
      </footer>
    </div>
  );
}
