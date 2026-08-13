import { useState } from 'react';
import { TrendingUp, Wallet, ArrowUpRight, Activity, Menu, X, DollarSign, Layers, Star } from 'lucide-react';
import type { ITemplateBlueprint, TemplateProps } from '../base/TemplateTypes';

export const CryptoTemplateBlueprint: ITemplateBlueprint = {
  id: 'crypto-dashboard-v1',
  name: 'Crypto & Web3 Analytics Blueprint',
  category: 'Crypto',
  filePath: 'src/templates/crypto/CryptoTemplate.tsx',
  renderComponent: ({ requirements, ui_spec, content }: TemplateProps) => {
    const theme = ui_spec.theme;
    const isDark = theme.mode === 'dark';

    const heroTitle = content?.hero?.title || `Real-Time Web3 & Crypto Intelligence Dashboard`;
    const heroSubtitle = content?.hero?.subtitle || `Institutional-grade decentralized analytics platform tracking live token liquidity, high-throughput node metrics, and cross-chain yield pools.`;
    const ctaText = content?.hero?.cta || 'Connect Web3 Wallet';
    const aboutTitle = content?.about?.title || 'Web3 Infrastructure';
    const aboutBody = content?.about?.body || 'Sub-second block telemetry, multi-sig cold storage vaults, and 99.99% mainnet validator uptime.';

    const cryptoAssets = content?.features && content.features.length > 0
      ? content.features.map((f, idx) => ({
          name: f.title,
          symbol: idx === 0 ? 'BTC' : idx === 1 ? 'ETH' : 'SOL',
          price: idx === 0 ? '$96,420.50' : idx === 1 ? '$3,452.18' : '$194.75',
          change: '+4.25%',
          isPositive: true,
          desc: f.description
        }))
      : [
          { name: 'Live Token Market Cap Grid', symbol: 'BTC', price: '$96,420.50', change: '+4.25%', isPositive: true, desc: 'Real-time liquidity tracking.' },
          { name: 'Validator Node Statistics', symbol: 'ETH', price: '$3,452.18', change: '+2.80%', isPositive: true, desc: '12,450 active nodes.' },
          { name: 'Multi-Sig Vault Security', symbol: 'SOL', price: '$194.75', change: '+8.12%', isPositive: true, desc: 'CertiK audited smart contracts.' }
        ];

    const testimonials = content?.testimonials && content.testimonials.length > 0
      ? content.testimonials
      : [{ name: 'Satoshi S', role: 'DeFi Analyst', quote: 'Unmatched real-time telemetry for liquidity pools.' }];

    const copyright = content?.footer?.copyright || `© 2026 ${requirements.category} Intelligence Labs. All rights reserved.`;
    const navLinks = content?.footer?.links && content.footer.links.length > 0 ? content.footer.links : ['Markets', 'Nodes', 'Staking', 'Audit'];

    return (
      <CryptoLiveView
        theme={theme}
        isDark={isDark}
        category={requirements.category}
        heroTitle={heroTitle}
        heroSubtitle={heroSubtitle}
        ctaText={ctaText}
        aboutTitle={aboutTitle}
        aboutBody={aboutBody}
        cryptoAssets={cryptoAssets}
        testimonials={testimonials}
        copyright={copyright}
        navLinks={navLinks}
      />
    );
  },
  renderCode: ({ requirements, ui_spec, content }: TemplateProps): string => {
    const theme = ui_spec.theme;
    const isDark = theme.mode === 'dark';

    const heroTitle = content?.hero?.title || `Real-Time Web3 & Crypto Intelligence Dashboard`;
    const heroSubtitle = content?.hero?.subtitle || `Institutional-grade decentralized analytics platform tracking live token liquidity, high-throughput node metrics, and cross-chain yield pools.`;
    const ctaText = content?.hero?.cta || 'Connect Web3 Wallet';

    return `import React, { useState } from 'react';
import { TrendingUp, Wallet, ShieldCheck, ArrowUpRight, Activity, Menu, X } from 'lucide-react';

export default function CryptoWebsite() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen font-sans antialiased p-4" style={{ backgroundColor: "${theme.backgroundColor}", color: "${theme.textColor}", fontFamily: "${theme.fontHeading}" }}>
      {/* Crypto Web3 Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b rounded-xl px-6 py-3.5 mb-8 flex items-center justify-between" style={{ borderColor: "${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}", backgroundColor: "${isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)'}" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/20" style={{ backgroundColor: "${theme.primaryColor}" }}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight" style={{ fontFamily: "${theme.fontHeading}" }}>
            ${requirements.category} Exchange & Analytics
          </span>
        </div>
      </header>

      {/* Hero Dashboard */}
      <section id="markets" className="pt-12 pb-16 max-w-7xl mx-auto px-4">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight mb-6" style={{ fontFamily: "${theme.fontHeading}" }}>
          ${heroTitle}
        </h1>
        <p className="text-lg opacity-80 max-w-2xl leading-relaxed mb-8">
          ${heroSubtitle}
        </p>
        <button className="px-6 py-3 rounded-xl font-bold text-white shadow-lg" style={{ backgroundColor: "${theme.primaryColor}" }}>
          ${ctaText}
        </button>
      </section>
    </div>
  );
}
`;
  }
};

function CryptoLiveView({ theme, isDark, category, heroTitle, heroSubtitle, ctaText, aboutTitle, aboutBody, cryptoAssets, testimonials, copyright, navLinks }: any) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState(false);

  return (
    <div 
      className="min-h-screen font-sans antialiased transition-colors duration-300 p-4"
      style={{ 
        backgroundColor: theme.backgroundColor, 
        color: theme.textColor,
        fontFamily: theme.fontHeading || 'sans-serif'
      }}
    >
      {/* Live Market Ticker Announcement Bar */}
      <div className="bg-slate-900 border border-slate-800 text-xs font-mono py-2 px-4 rounded-xl mb-4 flex items-center justify-between overflow-x-auto text-slate-300">
        <div className="flex items-center gap-6 shrink-0">
          <span className="flex items-center gap-1 font-bold text-amber-400"><DollarSign className="w-3.5 h-3.5" /> BTC: $96,420.50 <span className="text-emerald-400 text-[10px]">+4.2%</span></span>
          <span className="flex items-center gap-1 font-bold text-purple-400"><Layers className="w-3.5 h-3.5" /> ETH: $3,452.18 <span className="text-emerald-400 text-[10px]">+2.8%</span></span>
        </div>
        <div className="text-[10px] text-slate-500 font-bold shrink-0 hidden md:block">
          GAS: 12 GWEI | ETH/USD ORACLE ACTIVE
        </div>
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-md border-b rounded-xl px-6 py-3.5 mb-8 flex items-center justify-between" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', backgroundColor: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/20" style={{ backgroundColor: theme.primaryColor }}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight" style={{ fontFamily: theme.fontHeading }}>
            {category} Exchange & Dashboard
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold opacity-80">
          {navLinks.map((link: string, idx: number) => (
            <a key={idx} href={`#${link.toLowerCase()}`} className="hover:opacity-100 transition-opacity">{link}</a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button 
            onClick={() => setConnectedWallet(!connectedWallet)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xl flex items-center gap-2 transition-transform hover:scale-105 active:scale-95" 
            style={{ backgroundColor: connectedWallet ? '#059669' : theme.primaryColor }}
          >
            <Wallet className="w-4 h-4" />
            {connectedWallet ? '0x71C...39A2 (Connected)' : ctaText}
          </button>
        </div>

        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 opacity-80">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      <section id="markets" className="pt-8 pb-12 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border" style={{ backgroundColor: theme.primaryColor + '15', borderColor: theme.primaryColor + '40', color: theme.primaryColor }}>
              <Activity className="w-3.5 h-3.5" /> INSTITUTIONAL DEFI ARCHITECTURE
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6" style={{ fontFamily: theme.fontHeading }}>
              {heroTitle}
            </h1>
            <p className="text-base opacity-80 leading-relaxed mb-8 max-w-2xl">
              {heroSubtitle}
            </p>
          </div>

          <div className="p-6 rounded-2xl border bg-slate-900/60 border-slate-800 shadow-xl space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">{aboutTitle}</div>
            <p className="text-xs opacity-80 leading-relaxed">{aboutBody}</p>
          </div>
        </div>
      </section>

      {/* AI Features Grid */}
      <section id="assets" className="py-12 border-t max-w-7xl mx-auto px-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ fontFamily: theme.fontHeading }}>
          <TrendingUp className="w-6 h-6 text-cyan-400" /> Decentralized Protocol Capabilities
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cryptoAssets.map((asset: any, idx: number) => (
            <div key={idx} className="p-5 rounded-2xl border flex flex-col justify-between transition-transform hover:-translate-y-1 shadow-lg" style={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold font-mono px-2 py-1 rounded bg-slate-800 text-cyan-300 border border-slate-700">{asset.symbol || 'WEB3'}</span>
                  <span className="text-xs font-bold flex items-center text-emerald-400">{asset.change || '+4.2%'} <ArrowUpRight className="w-3.5 h-3.5" /></span>
                </div>
                <h3 className="font-bold text-lg mb-2">{asset.name || asset.title}</h3>
                <p className="opacity-75 text-xs font-mono leading-relaxed">{asset.desc || asset.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section id="testimonials" className="py-12 border-t max-w-7xl mx-auto px-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
          <div className="p-6 rounded-2xl border bg-slate-900/40 border-slate-800">
            <div className="flex gap-1 text-cyan-400 mb-2"><Star className="w-4 h-4 fill-cyan-400" /><Star className="w-4 h-4 fill-cyan-400" /><Star className="w-4 h-4 fill-cyan-400" /></div>
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
