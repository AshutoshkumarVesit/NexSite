import { useState } from 'react';
import { ChefHat, Sparkles, Menu, X, Star } from 'lucide-react';
import type { ITemplateBlueprint, TemplateProps } from '../base/TemplateTypes';

export const RestaurantTemplateBlueprint: ITemplateBlueprint = {
  id: 'restaurant-bistro-v1',
  name: 'Bistro & Fine Dining Blueprint',
  category: 'Restaurant',
  filePath: 'src/templates/restaurant/RestaurantTemplate.tsx',
  renderComponent: ({ requirements, ui_spec, content }: TemplateProps) => {
    const theme = ui_spec.theme;
    const isDark = theme.mode === 'dark';

    const heroTitle = content?.hero?.title || `Authentic Artisanal Italian Bistro & Dining`;
    const heroSubtitle = content?.hero?.subtitle || `Savor handcrafted egg tagliatelle, wood-fired prime steaks, and vintage wine pairings in an ambient setting.`;
    const ctaText = content?.hero?.cta || 'Reserve Your Table';
    const aboutTitle = content?.about?.title || 'Our Culinary Heritage';
    const aboutBody = content?.about?.body || 'Established with a passion for traditional recipes and farm-to-table organic ingredients.';

    const menuItems = content?.features && content.features.length > 0
      ? content.features
      : [
          { title: 'Truffle Infused Tagliatelle', description: 'Fresh egg pasta tossed in black truffle cream and wild forest mushrooms.' },
          { title: 'Wood-Fired Prime Ribeye', description: '45-day dry-aged beef cooked over white oak coals with rosemary garlic butter.' },
          { title: 'Artisanal Burrata & Heirloom Salad', description: 'Creamy Pugliese burrata served with ripe heirloom tomatoes and aged balsamic.' }
        ];

    const testimonials = content?.testimonials && content.testimonials.length > 0
      ? content.testimonials
      : [{ name: 'Chef Marco V', role: 'Michelin Guide Reviewer', quote: 'An extraordinary culinary journey blending authentic tradition with contemporary flair.' }];

    const copyright = content?.footer?.copyright || `© 2026 ${requirements.category} Bistro & Fine Dining. All rights reserved.`;
    const navLinks = content?.footer?.links && content.footer.links.length > 0 ? content.footer.links : ['Home', 'Menu', 'Gallery', 'Reservations', 'Contact'];

    return (
      <RestaurantLiveView
        theme={theme}
        isDark={isDark}
        category={requirements.category}
        heroTitle={heroTitle}
        heroSubtitle={heroSubtitle}
        ctaText={ctaText}
        aboutTitle={aboutTitle}
        aboutBody={aboutBody}
        menuItems={menuItems}
        testimonials={testimonials}
        copyright={copyright}
        navLinks={navLinks}
      />
    );
  },
  renderCode: ({ requirements, ui_spec, content }: TemplateProps): string => {
    const theme = ui_spec.theme;
    const isDark = theme.mode === 'dark';

    const heroTitle = content?.hero?.title || `Authentic Artisanal Italian Bistro & Dining`;
    const heroSubtitle = content?.hero?.subtitle || `Savor handcrafted egg tagliatelle, wood-fired prime steaks, and vintage wine pairings in an ambient setting.`;
    const ctaText = content?.hero?.cta || 'Reserve Your Table';

    return `import React, { useState } from 'react';
import { ChefHat, Sparkles, Menu, X, Star } from 'lucide-react';

export default function RestaurantWebsite() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen font-serif antialiased p-4" style={{ backgroundColor: "${theme.backgroundColor}", color: "${theme.textColor}", fontFamily: "${theme.fontHeading || 'serif'}" }}>
      {/* Restaurant Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b rounded-xl px-6 py-3.5 mb-8 flex items-center justify-between" style={{ borderColor: "${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}", backgroundColor: "${isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)'}" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: "${theme.primaryColor}" }}>
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-wide uppercase block" style={{ color: "${theme.textColor}" }}>
              ${requirements.category} Bistro
            </span>
            <span className="text-[10px] tracking-widest uppercase opacity-60 font-sans block">Fine Dining & Wine Bar</span>
          </div>
        </div>
      </header>

      {/* Culinary Hero */}
      <section id="home" className="pt-16 pb-16 text-center max-w-5xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-sans font-semibold uppercase tracking-widest mb-6 border" style={{ backgroundColor: "${theme.primaryColor}15", borderColor: "${theme.primaryColor}40", color: "${theme.primaryColor}" }}>
          <Sparkles className="w-3.5 h-3.5" /> MICHELIN INSPIRED DINING
        </div>
        <h1 className="text-4xl sm:text-6xl font-normal tracking-tight leading-tight mb-6">
          ${heroTitle}
        </h1>
        <p className="text-lg opacity-80 max-w-2xl mx-auto font-sans leading-relaxed mb-8">
          ${heroSubtitle}
        </p>
        <button className="px-8 py-4 rounded-xl text-white font-sans font-bold shadow-xl" style={{ backgroundColor: "${theme.primaryColor}" }}>
          ${ctaText}
        </button>
      </section>
    </div>
  );
}
`;
  }
};

function RestaurantLiveView({ theme, isDark, category, heroTitle, heroSubtitle, ctaText, aboutTitle, aboutBody, menuItems, testimonials, copyright, navLinks }: any) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div 
      className="min-h-screen font-serif antialiased transition-colors duration-300 p-4"
      style={{ 
        backgroundColor: theme.backgroundColor, 
        color: theme.textColor,
        fontFamily: theme.fontHeading || 'serif'
      }}
    >
      <header className="sticky top-0 z-50 backdrop-blur-md border-b rounded-xl px-6 py-3.5 mb-8 flex items-center justify-between" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', backgroundColor: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: theme.primaryColor }}>
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-wide uppercase block" style={{ color: theme.textColor }}>
              {category} Bistro
            </span>
            <span className="text-[10px] tracking-widest uppercase opacity-60 font-sans block">Fine Dining & Wine Bar</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-sans font-medium uppercase tracking-wider opacity-80">
          {navLinks.map((link: string, idx: number) => (
            <a key={idx} href={`#${link.toLowerCase()}`} className="hover:opacity-100 transition-opacity">{link}</a>
          ))}
        </nav>

        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 opacity-80">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      <section id="home" className="pt-16 pb-16 text-center max-w-5xl mx-auto px-4 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-sans font-semibold uppercase tracking-widest mb-6 border" style={{ backgroundColor: theme.primaryColor + '15', borderColor: theme.primaryColor + '40', color: theme.primaryColor }}>
          <Sparkles className="w-3.5 h-3.5" /> MICHELIN INSPIRED DINING
        </div>

        <h1 className="text-4xl sm:text-6xl font-normal tracking-tight leading-tight mb-6">
          {heroTitle}
        </h1>

        <p className="text-lg opacity-80 max-w-2xl mx-auto font-sans leading-relaxed mb-8">
          {heroSubtitle}
        </p>

        <div className="flex justify-center gap-4 font-sans text-sm font-bold">
          <a href="#reservations" className="px-8 py-4 rounded-xl text-white shadow-xl transition-all hover:scale-105" style={{ backgroundColor: theme.primaryColor }}>
            {ctaText}
          </a>
        </div>
      </section>

      {/* AI-Generated About Section */}
      <section id="about" className="py-12 border-t max-w-4xl mx-auto px-4 text-center" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
        <h2 className="text-2xl font-bold mb-3">{aboutTitle}</h2>
        <p className="opacity-80 font-sans text-sm leading-relaxed max-w-2xl mx-auto">{aboutBody}</p>
      </section>

      {/* AI-Generated Menu / Features Grid */}
      <section id="menu" className="py-16 border-t max-w-5xl mx-auto px-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-sans uppercase tracking-widest opacity-60 block mb-2">Chef's Recommendations</span>
          <h2 className="text-3xl font-bold">Featured Dishes & Offerings</h2>
        </div>

        <div className="space-y-6">
          {menuItems.map((item: any, idx: number) => (
            <div key={idx} className="p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#F8FAFC', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
              <div className="max-w-2xl">
                <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                <p className="opacity-75 text-xs font-sans leading-relaxed">{item.description}</p>
              </div>
              <div className="text-sm font-bold shrink-0 font-sans px-3 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Chef Specialty
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section id="testimonials" className="py-12 border-t max-w-4xl mx-auto px-4 text-center" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
          <div className="p-6 rounded-2xl border bg-slate-900/40 border-slate-800">
            <div className="flex justify-center mb-3 text-amber-400 gap-1"><Star className="w-4 h-4 fill-amber-400" /><Star className="w-4 h-4 fill-amber-400" /><Star className="w-4 h-4 fill-amber-400" /><Star className="w-4 h-4 fill-amber-400" /><Star className="w-4 h-4 fill-amber-400" /></div>
            <p className="italic text-sm opacity-90 font-sans mb-3">"{testimonials[0].quote}"</p>
            <div className="text-xs font-bold font-sans text-white">{testimonials[0].name} — <span className="opacity-60">{testimonials[0].role}</span></div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="pt-8 pb-4 border-t text-center font-sans text-xs opacity-60" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
        {copyright}
      </footer>
    </div>
  );
}
