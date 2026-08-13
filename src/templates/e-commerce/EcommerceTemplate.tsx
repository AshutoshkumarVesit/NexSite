import { useState } from 'react';
import { ShoppingBag, Tag, ArrowRight, Star } from 'lucide-react';
import type { ITemplateBlueprint, TemplateProps } from '../base/TemplateTypes';

export const EcommerceTemplateBlueprint: ITemplateBlueprint = {
  id: 'ecommerce-store-v1',
  name: 'E-Commerce Storefront Blueprint',
  category: 'E-Commerce',
  filePath: 'src/templates/e-commerce/EcommerceTemplate.tsx',
  renderComponent: ({ requirements, ui_spec, content }: TemplateProps) => {
    const theme = ui_spec.theme;
    const isDark = theme.mode === 'dark';

    const heroTitle = content?.hero?.title || `Curated Premium Essentials for Modern Living`;
    const heroSubtitle = content?.hero?.subtitle || `Discover exclusive collections crafted with sustainable materials, precision engineering, and timeless aesthetic design.`;
    const ctaText = content?.hero?.cta || 'Shop Latest Arrivals';
    const aboutTitle = content?.about?.title || 'Craftsmanship & Materials';
    const aboutBody = content?.about?.body || 'Precision engineered with anodized aluminum and sustainable materials for modern workspace aesthetics.';

    const products = content?.features && content.features.length > 0
      ? content.features.map((f, idx) => ({
          name: f.title,
          price: idx === 0 ? '$189' : idx === 1 ? '$49' : '$79',
          badge: idx === 0 ? 'Best Seller' : 'New Arrival',
          tag: 'Featured Item',
          desc: f.description
        }))
      : [
          { name: 'Minimalist Wireless Mechanical Keyboard', price: '$189', badge: 'Best Seller', tag: 'Peripherals', desc: 'Hot-swappable switches with anodized body.' },
          { name: 'Ergonomic Executive Desk Mat', price: '$49', badge: 'New Arrival', tag: 'Workspace', desc: 'Waterproof vegan leather mat.' },
          { name: 'Precision CNC Machined Headphones Stand', price: '$79', badge: '20% OFF', tag: 'Audio', desc: 'Anodized aluminum with cable slot.' }
        ];

    const testimonials = content?.testimonials && content.testimonials.length > 0
      ? content.testimonials
      : [{ name: 'David Kim', role: 'Verified Customer', quote: 'Outstanding build quality and express shipping. Upgraded my workspace instantly!' }];

    const copyright = content?.footer?.copyright || `© 2026 ${requirements.category} Essentials Inc. All rights reserved.`;
    const navLinks = content?.footer?.links && content.footer.links.length > 0 ? content.footer.links : ['Home', 'Shop', 'Categories', 'Deals', 'Contact'];

    return (
      <EcommerceLiveView
        theme={theme}
        isDark={isDark}
        category={requirements.category}
        heroTitle={heroTitle}
        heroSubtitle={heroSubtitle}
        ctaText={ctaText}
        aboutTitle={aboutTitle}
        aboutBody={aboutBody}
        products={products}
        testimonials={testimonials}
        copyright={copyright}
        navLinks={navLinks}
      />
    );
  },
  renderCode: ({ requirements, ui_spec, content }: TemplateProps): string => {
    const theme = ui_spec.theme;
    const isDark = theme.mode === 'dark';

    const heroTitle = content?.hero?.title || `Curated Premium Essentials for Modern Living`;
    const heroSubtitle = content?.hero?.subtitle || `Discover exclusive collections crafted with sustainable materials, precision engineering, and timeless aesthetic design.`;
    const ctaText = content?.hero?.cta || 'Shop Latest Arrivals';

    return `import React, { useState } from 'react';
import { ShoppingBag, Tag, ArrowRight } from 'lucide-react';

export default function EcommerceWebsite() {
  const [cartCount, setCartCount] = useState(2);

  return (
    <div className="min-h-screen font-sans antialiased p-4" style={{ backgroundColor: "${theme.backgroundColor}", color: "${theme.textColor}", fontFamily: "${theme.fontBody}" }}>
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] font-bold text-center py-1.5 px-4 uppercase rounded-lg mb-4">
        ⚡ FREE EXPRESS SHIPPING ON ALL ORDERS OVER $99 — LIMITED TIME ONLY
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-md border-b rounded-xl px-6 py-3.5 mb-8 flex items-center justify-between" style={{ borderColor: "${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}", backgroundColor: "${isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)'}" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg font-bold" style={{ backgroundColor: "${theme.primaryColor}" }}>
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight" style={{ fontFamily: "${theme.fontHeading}" }}>
            ${requirements.category} Essentials
          </span>
        </div>
      </header>

      <section id="home" className="pt-12 pb-16 max-w-7xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border" style={{ backgroundColor: "${theme.primaryColor}15", borderColor: "${theme.primaryColor}40", color: "${theme.primaryColor}" }}>
          <Tag className="w-3.5 h-3.5" /> 2026 SPRING COLLECTION
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight mb-6" style={{ fontFamily: "${theme.fontHeading}" }}>
          ${heroTitle}
        </h1>
        <p className="text-lg opacity-80 max-w-2xl mx-auto leading-relaxed mb-8">
          ${heroSubtitle}
        </p>
        <a href="#shop" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm text-white shadow-xl" style={{ backgroundColor: "${theme.primaryColor}" }}>
          ${ctaText} <ArrowRight className="w-4 h-4" />
        </a>
      </section>
    </div>
  );
}
`;
  }
};

function EcommerceLiveView({ theme, isDark, category, heroTitle, heroSubtitle, ctaText, aboutTitle, aboutBody, products, testimonials, copyright, navLinks }: any) {
  const [cartCount, setCartCount] = useState(2);

  return (
    <div 
      className="min-h-screen font-sans antialiased transition-colors duration-300 p-4"
      style={{ 
        backgroundColor: theme.backgroundColor, 
        color: theme.textColor,
        fontFamily: theme.fontBody
      }}
    >
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] font-bold text-center py-1.5 px-4 tracking-wider uppercase rounded-lg mb-4">
        ⚡ FREE EXPRESS SHIPPING ON ALL ORDERS OVER $99 — LIMITED TIME ONLY
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-md border-b rounded-xl px-6 py-3.5 mb-8 flex items-center justify-between" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', backgroundColor: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg font-bold" style={{ backgroundColor: theme.primaryColor }}>
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight" style={{ fontFamily: theme.fontHeading }}>
            {category} Essentials
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium opacity-80">
          {navLinks.map((link: string, idx: number) => (
            <a key={idx} href={`#${link.toLowerCase()}`} className="hover:opacity-100 transition-opacity">{link}</a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button className="p-2 rounded-lg opacity-80 hover:opacity-100 relative">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          </button>
        </div>
      </header>

      <section id="home" className="pt-12 pb-16 max-w-7xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border" style={{ backgroundColor: theme.primaryColor + '15', borderColor: theme.primaryColor + '40', color: theme.primaryColor }}>
          <Tag className="w-3.5 h-3.5" /> 2026 SPRING COLLECTION
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight mb-6" style={{ fontFamily: theme.fontHeading }}>
          {heroTitle}
        </h1>

        <p className="text-lg opacity-80 max-w-2xl mx-auto leading-relaxed mb-8">
          {heroSubtitle}
        </p>

        <div className="flex justify-center gap-4">
          <a href="#shop" className="px-8 py-4 rounded-xl font-bold text-sm text-white shadow-xl flex items-center gap-2 transition-transform hover:scale-105" style={{ backgroundColor: theme.primaryColor }}>
            {ctaText} <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* AI About Section */}
      <section id="about" className="py-12 border-t max-w-7xl mx-auto px-4 text-center" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
        <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: theme.fontHeading }}>{aboutTitle}</h2>
        <p className="opacity-80 text-sm leading-relaxed max-w-2xl mx-auto">{aboutBody}</p>
      </section>

      {/* AI Products / Features Grid */}
      <section id="shop" className="py-16 border-t max-w-7xl mx-auto px-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((prod: any, idx: number) => (
            <div key={idx} className="p-4 rounded-2xl border flex flex-col justify-between transition-transform hover:-translate-y-1 shadow-md" style={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
              <div>
                <div className="h-40 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-center relative mb-4">
                  <span className="px-2 py-0.5 rounded bg-purple-900 text-purple-200 text-[10px] font-bold uppercase absolute top-3 left-3">{prod.badge || 'Featured'}</span>
                  <ShoppingBag className="w-10 h-10 opacity-30" />
                </div>
                <h3 className="font-bold text-sm mb-1 leading-tight" style={{ fontFamily: theme.fontHeading }}>{prod.name}</h3>
                <p className="opacity-75 text-xs mb-3">{prod.desc}</p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-base font-bold" style={{ color: theme.primaryColor }}>{prod.price || '$99'}</span>
                <button 
                  onClick={() => setCartCount(c => c + 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-transform active:scale-95" 
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section id="testimonials" className="py-12 border-t max-w-4xl mx-auto px-4 text-center" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
          <div className="p-6 rounded-2xl border bg-slate-900/40 border-slate-800">
            <div className="flex justify-center mb-2 text-emerald-400 gap-1"><Star className="w-4 h-4 fill-emerald-400" /><Star className="w-4 h-4 fill-emerald-400" /><Star className="w-4 h-4 fill-emerald-400" /></div>
            <p className="italic text-sm opacity-90 mb-2">"{testimonials[0].quote}"</p>
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
