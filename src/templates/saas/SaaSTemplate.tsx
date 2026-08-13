import { useState } from 'react';
import { Cpu, ArrowRight, Menu, X, Activity, BarChart2, Star } from 'lucide-react';
import type { ITemplateBlueprint, TemplateProps } from '../base/TemplateTypes';

export const SaaSTemplateBlueprint: ITemplateBlueprint = {
  id: 'saas-engine-v1',
  name: 'SaaS Platform Blueprint',
  category: 'SaaS',
  filePath: 'src/templates/saas/SaaSTemplate.tsx',
  renderComponent: ({ requirements, ui_spec, content }: TemplateProps) => {
    const theme = ui_spec.theme;
    const isDark = theme.mode === 'dark';

    const heroTitle = content?.hero?.title || `Scale Systems with ${requirements.category} Automation`;
    const heroSubtitle = content?.hero?.subtitle || `Empower your development team with continuous workflow orchestration, real-time analytics, and instant infrastructure deployments.`;
    const ctaText = content?.hero?.cta || 'Start Free Trial';
    const aboutTitle = content?.about?.title || 'Engineered for Scale';
    const aboutBody = content?.about?.body || 'Sub-millisecond latency, resilient multi-agent execution, and enterprise security compliance.';

    const featureItems = content?.features && content.features.length > 0
      ? content.features.map((f, idx) => ({
          heading: f.title,
          description: f.description,
          icon: idx % 2 === 0 ? 'Zap' : 'Cpu'
        }))
      : [
          { heading: 'Autonomous Agent Pipeline', description: 'LangGraph StateGraph workflow engine coordinating specialist nodes.', icon: 'Zap' },
          { heading: 'UI UX Pro Design Systems', description: 'Accessible contrast ratios, dynamic dark mode, and micro-interactions.', icon: 'Cpu' },
          { heading: 'Clean Architecture Code', description: 'Export 100% modular React and TailwindCSS code with zero bloat.', icon: 'Zap' }
        ];

    const testimonials = content?.testimonials && content.testimonials.length > 0
      ? content.testimonials
      : [{ name: 'Alex Rivera', role: 'CTO @ CloudMatrix', quote: 'Accelerated our web app product delivery by 10x with flawless clean code.' }];

    const copyright = content?.footer?.copyright || `© 2026 ${requirements.category} Platform Inc. All rights reserved.`;
    const navLinks = content?.footer?.links && content.footer.links.length > 0 ? content.footer.links : ['Home', 'Features', 'Solutions', 'Pricing', 'Contact'];

    return (
      <SaaSLiveView
        theme={theme}
        isDark={isDark}
        category={requirements.category}
        heroTitle={heroTitle}
        heroSubtitle={heroSubtitle}
        ctaText={ctaText}
        aboutTitle={aboutTitle}
        aboutBody={aboutBody}
        featureItems={featureItems}
        testimonials={testimonials}
        copyright={copyright}
        navLinks={navLinks}
      />
    );
  },
  renderCode: ({ requirements, ui_spec, content }: TemplateProps): string => {
    const theme = ui_spec.theme;
    const isDark = theme.mode === 'dark';

    const heroTitle = content?.hero?.title || `Scale Systems with ${requirements.category} Automation`;
    const heroSubtitle = content?.hero?.subtitle || `Empower your development team with continuous workflow orchestration, real-time analytics, and instant infrastructure deployments.`;
    const ctaText = content?.hero?.cta || 'Start Free Trial';

    return `import React, { useState } from 'react';
import { Cpu, ArrowRight, Menu, X, Activity, BarChart2 } from 'lucide-react';

export default function SaaSWebsite() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen font-sans antialiased p-4" style={{ backgroundColor: "${theme.backgroundColor}", color: "${theme.textColor}", fontFamily: "${theme.fontBody}" }}>
      {/* SaaS Platform Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b rounded-xl px-6 py-3.5 mb-8 flex items-center justify-between" style={{ borderColor: "${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}", backgroundColor: "${isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)'}" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: "${theme.primaryColor}" }}>
            <Cpu className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "${theme.fontHeading}" }}>
            ${requirements.category} Engine
          </span>
        </div>
      </header>

      {/* SaaS Hero */}
      <section id="home" className="pt-12 pb-16 text-center max-w-7xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border" style={{ backgroundColor: "${theme.primaryColor}15", borderColor: "${theme.primaryColor}40", color: "${theme.primaryColor}" }}>
          <Activity className="w-3.5 h-3.5" /> High-Performance Infrastructure
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold max-w-4xl mx-auto leading-tight mb-6" style={{ fontFamily: "${theme.fontHeading}" }}>
          ${heroTitle}
        </h1>
        <p className="text-lg opacity-75 max-w-2xl mx-auto mb-8 leading-relaxed">
          ${heroSubtitle}
        </p>
        <button className="px-8 py-4 rounded-xl font-bold text-white shadow-xl" style={{ backgroundColor: "${theme.primaryColor}" }}>
          ${ctaText}
        </button>
      </section>
    </div>
  );
}
`;
  }
};

function SaaSLiveView({ theme, isDark, category, heroTitle, heroSubtitle, ctaText, aboutTitle, aboutBody, featureItems, testimonials, copyright, navLinks }: any) {
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
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: theme.primaryColor }}>
            <Cpu className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ fontFamily: theme.fontHeading }}>
            {category} Engine
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium opacity-80">
          {navLinks.map((link: string, idx: number) => (
            <a key={idx} href={`#${link.toLowerCase()}`} className="hover:opacity-100 transition-opacity">{link}</a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <button className="px-5 py-2.5 text-sm font-bold rounded-xl text-white shadow-lg transition-transform hover:scale-105" style={{ backgroundColor: theme.primaryColor }}>
            {ctaText} <ArrowRight className="w-4 h-4 inline ml-1" />
          </button>
        </div>

        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 opacity-80">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      <section id="home" className="pt-12 pb-16 text-center max-w-7xl mx-auto px-4 relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border" style={{ backgroundColor: theme.primaryColor + '15', borderColor: theme.primaryColor + '40', color: theme.primaryColor }}>
          <Activity className="w-3.5 h-3.5" /> High-Performance Infrastructure
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold max-w-4xl mx-auto leading-tight mb-6" style={{ fontFamily: theme.fontHeading }}>
          {heroTitle}
        </h1>
        <p className="text-lg opacity-75 max-w-2xl mx-auto mb-8 leading-relaxed">
          {heroSubtitle}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button className="px-8 py-4 rounded-xl font-bold text-white shadow-xl transition-all hover:scale-105" style={{ backgroundColor: theme.primaryColor }}>
            {ctaText}
          </button>
        </div>
      </section>

      {/* AI About Section */}
      <section id="about" className="py-12 border-t text-center max-w-4xl mx-auto px-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
        <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: theme.fontHeading }}>{aboutTitle}</h2>
        <p className="opacity-80 text-sm leading-relaxed max-w-2xl mx-auto">{aboutBody}</p>
      </section>

      {/* AI Features Grid */}
      <section id="features" className="py-16 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: theme.fontHeading }}>System Features & Architecture</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featureItems.map((item: any, idx: number) => (
              <div key={idx} className="p-6 rounded-2xl border transition-transform hover:-translate-y-1 shadow-md" style={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: theme.secondaryColor + '20', color: theme.secondaryColor }}>
                  <BarChart2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: theme.fontHeading }}>{item.heading}</h3>
                <p className="opacity-75 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section id="testimonials" className="py-12 border-t max-w-4xl mx-auto px-4 text-center" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
          <div className="p-6 rounded-2xl border bg-slate-900/40 border-slate-800">
            <div className="flex justify-center mb-2 text-purple-400 gap-1"><Star className="w-4 h-4 fill-purple-400" /><Star className="w-4 h-4 fill-purple-400" /><Star className="w-4 h-4 fill-purple-400" /></div>
            <p className="italic text-sm opacity-90 mb-2">"{testimonials[0].quote}"</p>
            <div className="text-xs font-bold text-white">{testimonials[0].name} — <span className="opacity-60">{testimonials[0].role}</span></div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="pt-8 pb-4 border-t text-xs opacity-60 text-center" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
        {copyright}
      </footer>
    </div>
  );
}
