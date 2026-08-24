import type { ILLMProvider, LLMRequestOptions } from '../../core/interfaces/ILLMProvider.ts';

/**
 * MockLLMProvider — prompt-aware fallback engine.
 * Dynamically extracts the user's intent and prompt from any agent request
 * and produces rich, contextually accurate JSON without generic placeholders.
 */
export class MockLLMProvider implements ILLMProvider {
  public readonly name = 'MockLLMProvider';

  public async generateText(prompt: string, _options?: LLMRequestOptions): Promise<string> {
    return `[Mock] ${prompt.slice(0, 80)}`;
  }

  public async generateJSON<T>(prompt: string, _schemaDescription: string, _options?: LLMRequestOptions): Promise<T> {
    // 1. Robust prompt extraction across all agent prompt templates
    let userRawPrompt = '';
    const userPromptMatch = prompt.match(/(?:USER INPUT PROMPT|USER PROJECT REQUEST|User Request|User Prompt):\s*[\r\n]*["']?([^"'\r\n]+)["']?/i)
      || prompt.match(/raw_prompt["']?\s*:\s*["']([^"']+)["']/i)
      || prompt.match(/Category:\s*([^\r\n]+)/i);

    if (userPromptMatch && userPromptMatch[1]) {
      userRawPrompt = userPromptMatch[1].trim();
    }

    if (!userRawPrompt || userRawPrompt.toLowerCase().includes('general website')) {
      userRawPrompt = 'Video Streaming Platform';
    }

    // 2. Identify prompt domain / category
    const lowerPrompt = (userRawPrompt + ' ' + prompt).toLowerCase();
    const isVideo = /youtube|video|stream|tube|broadcast|watch|player/i.test(lowerPrompt);
    const isEcommerce = /ecommerce|shop|store|product|buy|cart|keyboard/i.test(lowerPrompt);
    const isRestaurant = /restaurant|cafe|dining|food|bistro|menu|dish|italian/i.test(lowerPrompt);
    const isHealthcare = /health|clinic|doctor|hospital|medical|patient|dentist/i.test(lowerPrompt);
    const isCrypto = /crypto|web3|blockchain|token|wallet|defi|nft/i.test(lowerPrompt);
    const isFitness = /fitness|gym|workout|trainer|crossfit|yoga/i.test(lowerPrompt);
    const isPortfolio = /portfolio|developer|engineer|designer|resume/i.test(lowerPrompt);
    const isAgency = /agency|studio|creative|marketing|brand/i.test(lowerPrompt);

    let category = 'Platform';
    if (isVideo) category = 'Video Streaming';
    else if (isEcommerce) category = 'E-Commerce';
    else if (isRestaurant) category = 'Restaurant';
    else if (isHealthcare) category = 'Healthcare';
    else if (isCrypto) category = 'Crypto';
    else if (isFitness) category = 'Fitness';
    else if (isPortfolio) category = 'Portfolio';
    else if (isAgency) category = 'Agency';
    else {
      const clean = userRawPrompt.replace(/^(make|create|build|generate|clone of|a|an|the)\s+/i, '').trim();
      category = clean.split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Platform';
    }

    // ── ProjectManagerAgent ────────────────────────────────────────────────
    if (prompt.includes('ProjectManagerAgent') || (prompt.includes('EXPECTED JSON SCHEMA') && prompt.includes('category'))) {
      let keyFeatures = [
        'Interactive Showcase',
        'Feature Discovery',
        'Live Community Feed',
        'Responsive Mobile Layout',
        'Search & Filter System'
      ];

      if (isVideo) {
        keyFeatures = [
          'Video Player & Streaming Feed',
          'Trending Videos & Recommendations',
          'Channel Subscriptions & Profiles',
          'Search with Tag Filters',
          'User Comments & Likes',
          'Watch Later & Playlist Management'
        ];
      } else if (isEcommerce) {
        keyFeatures = ['Product Grid & Filters', 'Shopping Cart & Checkout', 'Featured Deals & Badges', 'Customer Reviews', 'Express Shipping'];
      } else if (isRestaurant) {
        keyFeatures = ['Chef Specials Menu', 'Online Table Reservation', 'Wine Pairings Guide', 'Customer Testimonials', 'Location & Hours'];
      } else if (isHealthcare) {
        keyFeatures = ['Medical Specialties', 'Doctor Profiles & Credentials', 'Online Appointment Booking', 'Patient Portal', 'Emergency Contact'];
      } else if (isCrypto) {
        keyFeatures = ['Live Token Price Ticker', 'Liquidity & Node Telemetry', 'Web3 Wallet Connection', 'Staking Yield Pools', 'Security Audit Badges'];
      }

      return {
        category,
        target_audience: isVideo ? 'Video creators, streamers, and viewers' : `People looking for ${userRawPrompt}`,
        key_features: keyFeatures,
        preferred_theme: 'dark',
        tone: 'bold'
      } as unknown as T;
    }

    // ── UIAgent ────────────────────────────────────────────────────────────
    if (prompt.includes('UIAgent') || prompt.includes('UISpecification')) {
      const primaryColor = isVideo ? '#EF4444' : isCrypto ? '#10B981' : isHealthcare ? '#0EA5E9' : isRestaurant ? '#D97706' : '#8B5CF6';
      const secondaryColor = isVideo ? '#DC2626' : isCrypto ? '#059669' : isHealthcare ? '#38BDF8' : isRestaurant ? '#F59E0B' : '#3B82F6';
      const accentColor = isVideo ? '#F87171' : isCrypto ? '#34D399' : isHealthcare ? '#7DD3FC' : isRestaurant ? '#FBBF24' : '#EC4899';

      return {
        theme: {
          mode: 'dark',
          primaryColor,
          secondaryColor,
          accentColor,
          backgroundColor: '#0A0A0F',
          textColor: '#F8FAFC',
          fontHeading: 'Space Grotesk, sans-serif',
          fontBody: 'Inter, sans-serif'
        },
        layout: {
          pageSections: ['Navbar', 'Hero', 'Features', 'About', 'Testimonials', 'Footer'],
          navbarStyle: 'sticky-glassmorphism',
          heroStyle: 'centered-gradient-hero',
          cardStyle: 'elevated-dark-card',
          footerStyle: 'minimal-footer'
        },
        components: ['Navbar', 'Hero', 'Features', 'About', 'Testimonials', 'Footer'],
        animations: ['fade-in-up', 'hover-scale'],
        spacing: { sectionPadding: 'py-16 px-6', containerWidth: 'max-w-7xl mx-auto', cardPadding: 'p-6', gridGap: 'gap-6' },
        responsiveRules: { mobile: 'flex flex-col px-4', tablet: 'md:grid-cols-2', desktop: 'lg:grid-cols-3 lg:px-8' }
      } as unknown as T;
    }

    // ── ContentAgent ───────────────────────────────────────────────────────
    if (prompt.includes('ContentAgent') || (prompt.includes('hero') && prompt.includes('testimonials'))) {
      if (isVideo) {
        return {
          hero: {
            title: 'Stream, Share, and Discover Millions of Videos',
            subtitle: 'Join a global community of creators. Watch trending videos, subscribe to your favorite channels, and stream in 4K HDR.',
            cta: 'Start Watching'
          },
          about: {
            title: 'The Next-Generation Video Platform',
            body: 'Empowering creators and viewers worldwide with ultra-fast streaming, personalized recommendations, and real-time live chat.'
          },
          features: [
            { title: '4K Ultra-HD Video Streaming', description: 'Crystal-clear video playback with adaptive bitrate and instant bufferless loading.' },
            { title: 'Personalized Recommendations', description: 'AI-driven discovery curating trending music, gaming, podcasts, and tech videos.' },
            { title: 'Creator Channels & Memberships', description: 'Subscribe to channels, leave comments, and join exclusive creator communities.' }
          ],
          testimonials: [
            { name: 'Alex Rivera', role: 'Content Creator (1.4M Subs)', quote: 'The smoothest streaming and community engagement platform built for creators.' },
            { name: 'Sarah Chen', role: 'Verified Streamer', quote: 'Zero lag, incredible video quality, and a vibrant community of passionate viewers.' }
          ],
          footer: {
            copyright: '© 2026 NexTube Video Network. All rights reserved.',
            links: ['Home', 'Trending', 'Subscriptions', 'Library', 'History']
          }
        } as unknown as T;
      }

      return {
        hero: {
          title: `Experience the Power of ${category}`,
          subtitle: `Discover high-performance tools and solutions built specifically for ${userRawPrompt}.`,
          cta: 'Explore Platform'
        },
        about: {
          title: `About Our ${category} Platform`,
          body: `Dedicated to delivering an exceptional experience for ${userRawPrompt}. Built with modern design tokens and high-speed infrastructure.`
        },
        features: [
          { title: 'High Performance & Speed', description: 'Sub-second response times and continuous operational uptime.' },
          { title: 'Intuitive Modern Design', description: 'Crafted with clean UI UX Pro design standards and accessible contrast.' },
          { title: 'Global Community Support', description: 'Connect with a thriving network of users and enthusiasts worldwide.' }
        ],
        testimonials: [
          { name: 'Elena Rostova', role: 'Verified Member', quote: 'Transformed our daily workflow and elevated our digital experience.' }
        ],
        footer: {
          copyright: `© 2026 ${category} Platform Inc. All rights reserved.`,
          links: ['Home', 'Features', 'Community', 'Support', 'Contact']
        }
      } as unknown as T;
    }

    // ── ComponentPlannerAgent ──────────────────────────────────────────────
    if (prompt.includes('ComponentPlannerAgent') || prompt.includes('Component Plan JSON') || prompt.includes('component_plan')) {
      return {
        components: [
          { name: 'Navbar', purpose: 'Navigation header with branding and search', props: ['data'] },
          { name: 'Hero', purpose: 'Main showcase hero banner', props: ['data'] },
          { name: 'Features', purpose: 'Core features and content grid', props: ['data'] },
          { name: 'About', purpose: 'About and mission section', props: ['data'] },
          { name: 'Testimonials', purpose: 'Community reviews and ratings', props: ['data'] },
          { name: 'Footer', purpose: 'Footer with copyright and navigation links', props: ['data'] },
          { name: 'App', purpose: 'Root application component' }
        ]
      } as unknown as T;
    }

    // ── DataModelAgent ─────────────────────────────────────────────────────
    if (prompt.includes('DataModelAgent') || prompt.includes('Data Architect') || prompt.includes('data_model')) {
      if (isVideo) {
        return {
          navbar: {
            title: 'NexTube',
            searchPlaceholder: 'Search videos, channels, and playlists...',
            links: ['Home', 'Trending', 'Subscriptions', 'Library']
          },
          hero: {
            title: 'Stream, Share, and Discover Millions of Videos',
            subtitle: 'Watch trending videos from top creators in crystal-clear 4K HDR quality.',
            cta: 'Start Watching'
          },
          features: [
            { title: '4K Ultra-HD Streaming', description: 'Adaptive bitrate with zero buffer lag.' },
            { title: 'AI Recommendations', description: 'Smart personalized video feeds tailored to your interests.' },
            { title: 'Creator Channels', description: 'Subscribe, like, comment, and engage with your favorite creators.' }
          ],
          about: {
            title: 'About NexTube',
            body: 'Empowering creators worldwide with modern streaming tools and global reach.'
          },
          testimonials: [
            { name: 'Marcus Vance', role: 'Creator (2.4M Subs)', quote: 'The best streaming platform for building a dedicated audience.' }
          ],
          footer: {
            copyright: '© 2026 NexTube Video Network. All rights reserved.',
            links: ['Home', 'Trending', 'Subscriptions', 'Library', 'Privacy']
          }
        } as unknown as T;
      }

      return {
        navbar: {
          title: category,
          links: ['Home', 'Explore', 'Features', 'Community', 'Contact']
        },
        hero: {
          title: `Experience the Power of ${category}`,
          subtitle: `Discover modern solutions and capabilities built specifically for ${userRawPrompt}.`,
          cta: 'Get Started'
        },
        features: [
          { title: 'High Performance & Speed', description: 'Sub-second response times and continuous operational uptime.' },
          { title: 'Intuitive Modern Design', description: 'Crafted with clean UI UX Pro design standards and accessible contrast.' },
          { title: 'Global Community Support', description: 'Connect with a thriving network of users and enthusiasts worldwide.' }
        ],
        about: {
          title: `About ${category}`,
          body: `Dedicated to delivering the best experience for ${userRawPrompt}.`
        },
        testimonials: [
          { name: 'Elena Rostova', role: 'Verified Member', quote: 'Transformed our digital experience completely.' }
        ],
        footer: {
          copyright: `© 2026 ${category} Inc. All rights reserved.`,
          links: ['Home', 'Features', 'Terms', 'Privacy', 'Contact']
        }
      } as unknown as T;
    }

    // ── IntegratorAgent / Component Generation ─────────────────────────────
    if (prompt.includes('IntegratorAgent') || prompt.includes('CodeRepairAgent') || prompt.includes('component_name') || prompt.includes('App.tsx')) {
      const missingCompMatch = prompt.match(/named\s+['"](\w+)['"]/i) || prompt.match(/component_name['"]?:\s*['"](\w+)['"]/i);
      const comp = (missingCompMatch && missingCompMatch[1]) || 'App';
      const filename = `${comp}.tsx`;

      const primaryColor = isVideo ? 'bg-red-600 hover:bg-red-500' : 'bg-purple-600 hover:bg-purple-500';
      const textColor = isVideo ? 'text-red-500' : 'text-purple-400';

      if (comp === 'Navbar') {
        return {
          [filename]: `import React from 'react';
import { Play, Search, Bell, User } from 'lucide-react';

export default function Navbar({ data = {} }: any) {
  const brand = data?.title || '${category}';
  const links = data?.links || ['Home', 'Explore', 'Features', 'Library'];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg ${primaryColor.split(' ')[0]} flex items-center justify-center text-white shadow-md">
          <Play size={16} fill="currentColor" />
        </div>
        <span className="font-bold text-lg text-white tracking-tight">{brand}</span>
      </div>
      <div className="flex-1 max-w-md mx-6 hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-full px-4 py-1.5 text-sm text-slate-300">
        <Search size={15} className="text-slate-500 mr-2 shrink-0" />
        <input type="text" placeholder="${isVideo ? 'Search videos and channels...' : 'Search...'}" className="bg-transparent outline-none w-full text-slate-200 placeholder-slate-500 text-xs" />
      </div>
      <nav className="flex items-center gap-4 text-xs font-medium text-slate-400">
        {(links ?? []).map((link: string, i: number) => (
          <span key={i} className="hover:text-white cursor-pointer transition-colors hidden md:inline">{link}</span>
        ))}
        <button className="px-4 py-1.5 rounded-full ${primaryColor} text-white font-medium transition-all text-xs shadow">
          Sign In
        </button>
      </nav>
    </header>
  );
}`
        } as unknown as T;
      }

      if (comp === 'Hero') {
        return {
          [filename]: `import React from 'react';
import { Play, Sparkles, ArrowRight } from 'lucide-react';

export default function Hero({ data = {} }: any) {
  const title = data?.title || '${isVideo ? 'Stream, Share, and Discover Millions of Videos' : `Experience the Power of ${category}`}';
  const subtitle = data?.subtitle || '${isVideo ? 'Watch trending creators, stream in 4K HDR quality, and join global creator communities.' : `Discover modern tools and solutions built specifically for ${userRawPrompt}.`}';
  const cta = data?.cta || 'Get Started';

  return (
    <section className="py-20 px-6 text-center max-w-5xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 mb-6 shadow-sm">
        <Sparkles size={14} className="${textColor}" />
        <span>Next-Generation ${category} Experience</span>
      </div>
      <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-6 leading-tight">
        {title}
      </h1>
      <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
        {subtitle}
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <button className="px-8 py-3.5 rounded-xl ${primaryColor} text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
          <Play size={16} fill="currentColor" />
          {cta}
        </button>
        <button className="px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2">
          Learn More <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}`
        } as unknown as T;
      }

      if (comp === 'Features') {
        return {
          [filename]: `import React from 'react';
import { Zap, Shield, Sparkles, Video, Users, Flame } from 'lucide-react';

export default function Features({ data = {} }: any) {
  const items = Array.isArray(data?.features) ? data.features : (Array.isArray(data) ? data : [
    { title: '${isVideo ? '4K Ultra-HD Video' : 'High Performance'}', description: '${isVideo ? 'Crystal clear bufferless streaming.' : 'Sub-millisecond latency and continuous uptime.'}' },
    { title: '${isVideo ? 'AI Video Discovery' : 'Modern UI Design'}', description: '${isVideo ? 'Intelligent personalized video recommendations.' : 'Crafted with UI UX Pro design standards.'}' },
    { title: '${isVideo ? 'Creator Communities' : 'Global Network'}', description: '${isVideo ? 'Subscribe, comment, and engage with creators.' : 'Connect with users and creators worldwide.'}' }
  ]);

  return (
    <section className="py-16 px-6 max-w-6xl mx-auto border-t border-slate-800/60">
      <div className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">Core Capabilities</h2>
        <p className="text-sm text-slate-400">Engineered for seamless performance and user delight</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(items ?? []).map((item: any, i: number) => (
          <div key={i} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 mb-4">
              <Sparkles size={20} className="${textColor}" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}`
        } as unknown as T;
      }

      if (comp === 'About') {
        return {
          [filename]: `import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function About({ data = {} }: any) {
  const title = data?.title || 'About Our Platform';
  const body = data?.body || 'Dedicated to delivering exceptional quality, speed, and creative freedom for our community.';

  return (
    <section className="py-16 px-6 max-w-5xl mx-auto border-t border-slate-800/60">
      <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">{title}</h2>
          <p className="text-slate-400 leading-relaxed mb-6">{body}</p>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm text-slate-300">
              <CheckCircle2 size={16} className="${textColor}" />
              <span>Built with high-throughput modern infrastructure</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-300">
              <CheckCircle2 size={16} className="${textColor}" />
              <span>Full mobile & desktop responsive design</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}`
        } as unknown as T;
      }

      if (comp === 'Testimonials') {
        return {
          [filename]: `import React from 'react';
import { Star } from 'lucide-react';

export default function Testimonials({ data = {} }: any) {
  const items = Array.isArray(data?.testimonials) ? data.testimonials : (Array.isArray(data) ? data : [
    { name: 'Marcus Vance', role: '${isVideo ? 'Verified Creator (2.4M Subs)' : 'Senior Architect'}', quote: 'Transformed our digital experience and accelerated community growth.' },
    { name: 'Elena Rostova', role: 'Verified User', quote: 'Exceptional responsiveness, crisp aesthetics, and zero buffering.' }
  ]);

  return (
    <section className="py-16 px-6 max-w-5xl mx-auto border-t border-slate-800/60">
      <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">Community Feedback</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(items ?? []).map((t: any, i: number) => (
          <div key={i} className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex gap-1 text-amber-400 mb-3">
              {[...Array(5)].map((_, idx) => <Star key={idx} size={14} fill="currentColor" />)}
            </div>
            <p className="text-sm text-slate-300 italic mb-4">"{t.quote}"</p>
            <div>
              <div className="font-bold text-sm text-white">{t.name}</div>
              <div className="text-xs text-slate-500">{t.role}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}`
        } as unknown as T;
      }

      if (comp === 'Footer') {
        return {
          [filename]: `import React from 'react';

export default function Footer({ data = {} }: any) {
  const copyright = data?.copyright || '© 2026 ${category}. All rights reserved.';
  const links = data?.links || ['Home', 'Explore', 'Features', 'Community', 'Privacy'];

  return (
    <footer className="py-12 px-6 border-t border-slate-800/80 bg-slate-950 text-center text-xs text-slate-500">
      <div className="flex flex-wrap justify-center gap-6 mb-4 font-medium text-slate-400">
        {(links ?? []).map((link: string, i: number) => (
          <span key={i} className="hover:text-white cursor-pointer transition-colors">{link}</span>
        ))}
      </div>
      <p>{copyright}</p>
    </footer>
  );
}`
        } as unknown as T;
      }

      // Default App.tsx
      return {
        'App.tsx': `import React from 'react';
import Navbar from './Navbar';
import Hero from './Hero';
import Features from './Features';
import About from './About';
import Testimonials from './Testimonials';
import Footer from './Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-slate-100 font-sans">
      <Navbar />
      <Hero />
      <Features />
      <About />
      <Testimonials />
      <Footer />
    </div>
  );
}`
      } as unknown as T;
    }

    // ── SEOAgent ───────────────────────────────────────────────────────────
    if (prompt.includes('SEOAgent') || prompt.includes('structuredDataJSON')) {
      return {
        title: `${category} — ${userRawPrompt}`,
        description: `Experience the best of ${userRawPrompt} online. High speed, responsive layout, and modern features.`,
        keywords: [userRawPrompt, category.toLowerCase(), 'streaming', 'platform', 'online'],
        openGraph: { title: category, description: `Discover ${userRawPrompt}`, type: 'website' },
        structuredDataJSON: `{"@context":"https://schema.org","@type":"WebSite","name":"${category}"}`,
        semanticHeadings: { h1: `${category} — ${userRawPrompt}`, h2s: ['Capabilities', 'About', 'Community Reviews'] }
      } as unknown as T;
    }

    // Default Fallback
    return { text: `[Mock] ${userRawPrompt}` } as unknown as T;
  }
}
