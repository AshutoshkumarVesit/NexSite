import { useState } from 'react';
import { Award, ArrowRight, Menu, X, Star } from 'lucide-react';
import type { ITemplateBlueprint, TemplateProps } from '../base/TemplateTypes';

export const AgencyTemplateBlueprint: ITemplateBlueprint = {
  id: 'agency-studio-v1',
  name: 'Creative Agency Studio Blueprint',
  category: 'Agency',
  filePath: 'src/templates/agency/AgencyTemplate.tsx',
  renderComponent: ({ requirements, ui_spec, content }: TemplateProps) => {
    const theme = ui_spec.theme;
    const isDark = theme.mode === 'dark';

    const heroTitle = content?.hero?.title || `Driving Digital Transformation & Brand Innovation`;
    const heroSubtitle = content?.hero?.subtitle || `Full-service creative agency building category-defining visual identities, high-converting digital platforms, and immersive brand experiences.`;
    const ctaText = content?.hero?.cta || 'Start a Project';
    const aboutTitle = content?.about?.title || 'Creative Studio Vision';
    const aboutBody = content?.about?.body || 'Partnering with ambitious founders and global enterprises to build memorable digital products.';

    const servicePillars = content?.features && content.features.length > 0
      ? content.features
      : [
          { title: 'Brand Strategy & Visual Identity', description: 'Crafting memorable brand systems, typography guidelines, and design tokens tailored for digital scale.' },
          { title: 'Full-Stack Web Engineering', description: 'Engineering robust web applications using React, Next.js, and high-performance serverless architectures.' },
          { title: 'Digital Growth & Campaign Design', description: 'Data-driven marketing campaigns, SEO strategy, and conversion optimization that boost market presence.' }
        ];

    const testimonials = content?.testimonials && content.testimonials.length > 0
      ? content.testimonials
      : [{ name: 'Jonathan Vance', role: 'Founder @ TechPulse', quote: 'Delivered an exceptional brand identity that doubled our enterprise pipeline.' }];

    const copyright = content?.footer?.copyright || `© 2026 ${requirements.category} Creative Studio. All rights reserved.`;
    const navLinks = content?.footer?.links && content.footer.links.length > 0 ? content.footer.links : ['Home', 'Work', 'Services', 'About', 'Contact'];

    return (
      <AgencyLiveView
        theme={theme}
        isDark={isDark}
        category={requirements.category}
        heroTitle={heroTitle}
        heroSubtitle={heroSubtitle}
        ctaText={ctaText}
        aboutTitle={aboutTitle}
        aboutBody={aboutBody}
        servicePillars={servicePillars}
        testimonials={testimonials}
        copyright={copyright}
        navLinks={navLinks}
      />
    );
  },
  renderCode: ({ requirements, ui_spec, content }: TemplateProps): string => {
    const theme = ui_spec.theme;
    const isDark = theme.mode === 'dark';

    const heroTitle = content?.hero?.title || `Driving Digital Transformation & Brand Innovation`;
    const heroSubtitle = content?.hero?.subtitle || `Full-service creative agency building category-defining visual identities, high-converting digital platforms, and immersive brand experiences.`;
    const ctaText = content?.hero?.cta || 'Start a Project';

    return `import React, { useState } from 'react';
import { Award, ArrowRight, Menu, X } from 'lucide-react';

export default function AgencyWebsite() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen font-sans antialiased p-4" style={{ backgroundColor: "${theme.backgroundColor}", color: "${theme.textColor}", fontFamily: "${theme.fontBody}" }}>
      {/* Agency Studio Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b rounded-xl px-6 py-3.5 mb-8 flex items-center justify-between" style={{ borderColor: "${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}", backgroundColor: "${isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)'}" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: "${theme.primaryColor}" }}>
            A
          </div>
          <span className="font-extrabold text-xl tracking-tight" style={{ fontFamily: "${theme.fontHeading}" }}>
            ${requirements.category} Studio
          </span>
        </div>
      </header>

      {/* Editorial Hero */}
      <section id="home" className="pt-16 pb-16 max-w-7xl mx-auto px-4">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border" style={{ backgroundColor: "${theme.primaryColor}15", borderColor: "${theme.primaryColor}40", color: "${theme.primaryColor}" }}>
            <Award className="w-3.5 h-3.5" /> AWARD WINNING CREATIVE STUDIO
          </div>
          <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tight leading-tight mb-8" style={{ fontFamily: "${theme.fontHeading}" }}>
            ${heroTitle}
          </h1>
          <p className="text-xl opacity-80 max-w-2xl leading-relaxed mb-8">
            ${heroSubtitle}
          </p>
          <a href="#contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm text-white shadow-xl" style={{ backgroundColor: "${theme.primaryColor}" }}>
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

function AgencyLiveView({ theme, isDark, category, heroTitle, heroSubtitle, ctaText, aboutTitle, aboutBody, servicePillars, testimonials, copyright, navLinks }: any) {
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg font-bold text-lg" style={{ backgroundColor: theme.primaryColor }}>
            A
          </div>
          <span className="font-extrabold text-xl tracking-tight" style={{ fontFamily: theme.fontHeading }}>
            {category} Studio
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold uppercase tracking-wider opacity-80">
          {navLinks.map((link: string, idx: number) => (
            <a key={idx} href={`#${link.toLowerCase()}`} className="hover:opacity-100 transition-opacity">{link}</a>
          ))}
        </nav>

        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 opacity-80">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      <section id="home" className="pt-16 pb-16 max-w-7xl mx-auto px-4">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border" style={{ backgroundColor: theme.primaryColor + '15', borderColor: theme.primaryColor + '40', color: theme.primaryColor }}>
            <Award className="w-3.5 h-3.5" /> AWARD WINNING CREATIVE STUDIO
          </div>

          <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tight leading-tight mb-8" style={{ fontFamily: theme.fontHeading }}>
            {heroTitle}
          </h1>

          <p className="text-xl opacity-80 max-w-2xl leading-relaxed mb-8">
            {heroSubtitle}
          </p>

          <div className="flex flex-wrap gap-4">
            <a href="#contact" className="px-8 py-4 rounded-xl font-bold text-sm text-white shadow-xl flex items-center gap-2 transition-transform hover:scale-105" style={{ backgroundColor: theme.primaryColor }}>
              {ctaText} <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* AI About Section */}
      <section id="about" className="py-12 border-t max-w-7xl mx-auto px-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
        <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: theme.fontHeading }}>{aboutTitle}</h2>
        <p className="opacity-80 text-base leading-relaxed max-w-3xl">{aboutBody}</p>
      </section>

      {/* AI Capability Pillars */}
      <section id="services" className="py-16 border-t max-w-7xl mx-auto px-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {servicePillars.map((pillar: any, idx: number) => (
            <div key={idx} className="p-8 rounded-3xl border transition-all hover:-translate-y-1 shadow-lg" style={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
              <div className="text-4xl font-extrabold opacity-30 mb-6" style={{ fontFamily: theme.fontHeading, color: theme.primaryColor }}>0{idx + 1}</div>
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: theme.fontHeading }}>{pillar.title}</h3>
              <p className="opacity-75 text-sm leading-relaxed">{pillar.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section id="testimonials" className="py-12 border-t max-w-7xl mx-auto px-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
          <div className="p-8 rounded-3xl border bg-slate-900/40 border-slate-800">
            <div className="flex gap-1 text-pink-400 mb-3"><Star className="w-4 h-4 fill-pink-400" /><Star className="w-4 h-4 fill-pink-400" /><Star className="w-4 h-4 fill-pink-400" /></div>
            <p className="italic text-base opacity-90 mb-3">"{testimonials[0].quote}"</p>
            <div className="text-sm font-bold text-white">{testimonials[0].name} — <span className="opacity-60">{testimonials[0].role}</span></div>
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
