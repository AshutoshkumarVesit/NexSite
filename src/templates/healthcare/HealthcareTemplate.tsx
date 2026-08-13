import { useState } from 'react';
import { HeartPulse, Stethoscope, ShieldCheck, Menu, X, ArrowRight, Star } from 'lucide-react';
import type { ITemplateBlueprint, TemplateProps } from '../base/TemplateTypes';

export const HealthcareTemplateBlueprint: ITemplateBlueprint = {
  id: 'healthcare-clinic-v1',
  name: 'Healthcare & Wellness Blueprint',
  category: 'Healthcare',
  filePath: 'src/templates/healthcare/HealthcareTemplate.tsx',
  renderComponent: ({ requirements, ui_spec, content }: TemplateProps) => {
    const theme = ui_spec.theme;
    const isDark = theme.mode === 'dark';

    const heroTitle = content?.hero?.title || `Compassionate Medical Care for Every Family`;
    const heroSubtitle = content?.hero?.subtitle || `State-of-the-art diagnostic facilities and expert specialist consultations committed to your long-term health and well-being.`;
    const ctaText = content?.hero?.cta || 'Book Appointment';
    const aboutTitle = content?.about?.title || 'Trusted Community Health Center';
    const aboutBody = content?.about?.body || 'Delivering patient-centered preventive screening, cardiology, and gentle pediatric care.';

    const medicalServices = content?.features && content.features.length > 0
      ? content.features
      : [
          { title: 'Cardiology Diagnostics', description: 'Advanced cardiovascular diagnostics, preventive screening, and cardiac care plans.' },
          { title: 'Pediatric Wellness', description: 'Gentle, specialized healthcare for infants, children, and adolescents.' },
          { title: 'Neurology Screening', description: 'Comprehensive neurological evaluation, headache management, and cognitive wellness.' }
        ];

    const testimonials = content?.testimonials && content.testimonials.length > 0
      ? content.testimonials
      : [{ name: 'Dr. Sarah Jenkins', role: 'Chief of Medicine', quote: 'We treat every patient like family, prioritizing preventative wellness.' }];

    const copyright = content?.footer?.copyright || `© 2026 ${requirements.category} Health Center. All rights reserved.`;
    const navLinks = content?.footer?.links && content.footer.links.length > 0 ? content.footer.links : ['Home', 'Services', 'Doctors', 'Appointments', 'Contact'];

    return (
      <HealthcareLiveView
        theme={theme}
        isDark={isDark}
        category={requirements.category}
        heroTitle={heroTitle}
        heroSubtitle={heroSubtitle}
        ctaText={ctaText}
        aboutTitle={aboutTitle}
        aboutBody={aboutBody}
        medicalServices={medicalServices}
        testimonials={testimonials}
        copyright={copyright}
        navLinks={navLinks}
      />
    );
  },
  renderCode: ({ requirements, ui_spec, content }: TemplateProps): string => {
    const theme = ui_spec.theme;
    const isDark = theme.mode === 'dark';

    const heroTitle = content?.hero?.title || `Compassionate Medical Care for Every Family`;
    const heroSubtitle = content?.hero?.subtitle || `State-of-the-art diagnostic facilities and expert specialist consultations committed to your long-term health and well-being.`;
    const ctaText = content?.hero?.cta || 'Book Appointment';

    return `import React, { useState } from 'react';
import { HeartPulse, Stethoscope, ShieldCheck, UserCheck, Menu, X, ArrowRight } from 'lucide-react';

export default function HealthcareWebsite() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen font-sans antialiased p-4" style={{ backgroundColor: "${theme.backgroundColor}", color: "${theme.textColor}", fontFamily: "${theme.fontBody}" }}>
      {/* Healthcare Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b rounded-xl px-6 py-3.5 mb-8 flex items-center justify-between" style={{ borderColor: "${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}", backgroundColor: "${isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)'}" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: "${theme.primaryColor}" }}>
            <HeartPulse className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "${theme.fontHeading}" }}>
            ${requirements.category} Medical Center
          </span>
        </div>
      </header>

      {/* Clinical Hero */}
      <section id="home" className="pt-16 pb-16 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 border" style={{ backgroundColor: "${theme.primaryColor}15", borderColor: "${theme.primaryColor}40", color: "${theme.primaryColor}" }}>
              <ShieldCheck className="w-3.5 h-3.5" /> BOARD-CERTIFIED SPECIALISTS
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-6" style={{ fontFamily: "${theme.fontHeading}" }}>
              ${heroTitle}
            </h1>
            <p className="text-base opacity-80 leading-relaxed mb-8">
              ${heroSubtitle}
            </p>
            <a href="#appointments" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-xs text-white shadow-lg" style={{ backgroundColor: "${theme.primaryColor}" }}>
              ${ctaText} <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
`;
  }
};

function HealthcareLiveView({ theme, isDark, category, heroTitle, heroSubtitle, ctaText, aboutTitle, aboutBody, medicalServices, testimonials, copyright, navLinks }: any) {
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
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: theme.primaryColor }}>
            <HeartPulse className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ fontFamily: theme.fontHeading }}>
            {category} Medical Center
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium opacity-80">
          {navLinks.map((link: string, idx: number) => (
            <a key={idx} href={`#${link.toLowerCase()}`} className="hover:opacity-100 transition-opacity">{link}</a>
          ))}
        </nav>

        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 opacity-80">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      <section id="home" className="pt-16 pb-16 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 border" style={{ backgroundColor: theme.primaryColor + '15', borderColor: theme.primaryColor + '40', color: theme.primaryColor }}>
              <ShieldCheck className="w-3.5 h-3.5" /> BOARD-CERTIFIED SPECIALISTS
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-6" style={{ fontFamily: theme.fontHeading }}>
              {heroTitle}
            </h1>
            <p className="text-base opacity-80 leading-relaxed mb-8">
              {heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#appointments" className="px-7 py-3.5 rounded-xl font-bold text-xs text-white shadow-lg flex items-center gap-2 transition-transform hover:scale-105" style={{ backgroundColor: theme.primaryColor }}>
                {ctaText} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="p-8 rounded-3xl border shadow-xl" style={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#F8FAFC', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
            <h3 className="text-xl font-bold mb-3" style={{ fontFamily: theme.fontHeading }}>{aboutTitle}</h3>
            <p className="text-xs opacity-80 leading-relaxed mb-6">{aboutBody}</p>

            <h4 className="text-xs font-bold uppercase text-emerald-400 tracking-wider mb-3">Specialty Offerings</h4>
            <div className="space-y-3 text-xs opacity-80">
              {medicalServices.map((m: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 border-b pb-2">
                  <Stethoscope className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">{m.title}</span>
                    <span className="opacity-75 text-[11px]">{m.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section id="testimonials" className="py-12 border-t max-w-4xl mx-auto px-4 text-center" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
          <div className="p-6 rounded-2xl border bg-slate-900/40 border-slate-800">
            <div className="flex justify-center mb-3 text-emerald-400 gap-1"><Star className="w-4 h-4 fill-emerald-400" /><Star className="w-4 h-4 fill-emerald-400" /><Star className="w-4 h-4 fill-emerald-400" /><Star className="w-4 h-4 fill-emerald-400" /><Star className="w-4 h-4 fill-emerald-400" /></div>
            <p className="italic text-sm opacity-90 mb-3">"{testimonials[0].quote}"</p>
            <div className="text-xs font-bold text-white">{testimonials[0].name} — <span className="opacity-60">{testimonials[0].role}</span></div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="pt-8 pb-4 border-t text-center text-xs opacity-60" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
        {copyright}
      </footer>
    </div>
  );
}
