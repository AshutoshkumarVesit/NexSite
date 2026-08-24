import { describe, it, expect } from 'vitest';
import { compileBundle } from './BundleCompiler';
import { TemplateRegistry } from '../../templates/TemplateRegistry';

describe('BundleCompiler - 0 Child in Root & Seamless Rendering Tests', () => {
  const dummyTemplateProps: any = {
    requirements: {
      category: 'Healthcare',
      tone: 'professional',
      target_audience: 'Patients',
      key_features: ['Appointments', 'Doctors'],
      raw_prompt: 'Healthcare clinic website'
    },
    ui_spec: {
      theme: {
        mode: 'dark' as const,
        primaryColor: '#0ea5e9',
        secondaryColor: '#38bdf8',
        backgroundColor: '#0f172a',
        textColor: '#f8fafc',
        fontHeading: 'Space Grotesk',
        fontBody: 'Inter',
        borderRadius: '0.75rem'
      },
      layout: 'standard',
      components: [],
      animations: [],
      spacing: {},
      responsiveRules: []
    },
    content: {
      hero: { title: 'Compassionate Care', subtitle: 'Leading medical services', cta: 'Book Now' },
      about: { title: 'About Us', body: 'We care for your health.' },
      features: [{ title: 'Cardiology', description: 'Advanced heart care' }],
      testimonials: [{ name: 'Jane Doe', role: 'Patient', quote: 'Great clinic' }],
      footer: { copyright: '© 2026 Health Clinic', links: ['Home', 'Services'] }
    },
    seo: {
      title: 'Health Clinic',
      description: 'Expert medical care',
      keywords: ['health', 'clinic'],
      ogTags: {},
      twitterTags: {}
    }
  };

  it('compiles all template blueprints without diagnostics errors and includes App last', () => {
    const categories = ['SaaS', 'Healthcare', 'Restaurant', 'Portfolio', 'E-Commerce', 'Crypto', 'Agency'];

    for (const cat of categories) {
      const blueprint = TemplateRegistry.getTemplate(cat);
      const code = blueprint.renderCode(dummyTemplateProps);

      const files: Record<string, string> = {
        'App.tsx': code,
        'index.css': '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n'
      };

      const result = compileBundle(files);
      expect(result.success, `Failed compiling template category: ${cat}`).toBe(true);
      expect(result.executionOrder).toContain('App');
      expect(result.srcdoc).toContain('IframeErrorBoundary');
      expect(result.srcdoc).toContain('__modules__[\'App\']');
      expect(result.srcdoc).toContain('NEXSITE_PREVIEW_READY');
    }
  });

  it('handles multi-component bundles with mixed exports, arrow functions, and undeclared icons', () => {
    const generatedFiles = {
      'Navbar.tsx': `
        import React from 'react';
        import { Shield, Sparkles } from 'lucide-react';
        export default function Navbar({ brand = 'NexSite' }) {
          return (
            <nav className="p-4 bg-slate-900 flex justify-between items-center">
              <span className="font-bold flex items-center gap-2"><Shield className="w-4 h-4 text-cyan-400" /> {brand}</span>
              <button className="flex items-center gap-1 px-3 py-1 bg-cyan-600 rounded"><Sparkles className="w-3 h-3" /> Get Started</button>
            </nav>
          );
        }
      `,
      'Hero.tsx': `
        import React from 'react';
        import { ArrowRight } from 'lucide-react';
        const HeroSection = (props: any) => {
          return (
            <section className="py-12 text-center">
              <h1 className="text-3xl font-bold">Build Fast with AI</h1>
              <p className="text-slate-400">Autonomous multi-agent website generator</p>
              <button className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded">
                Try Now <ArrowRight className="w-4 h-4" />
              </button>
            </section>
          );
        };
        export default HeroSection;
      `,
      'Features.tsx': `
        import React from 'react';
        import { CheckCircle2 } from 'lucide-react';
        export const FeatureList = ({ items = ['Speed', 'Quality', 'Autonomy'] }: any) => (
          <div className="p-6 grid grid-cols-3 gap-4">
            {(items ?? []).map((item: string, i: number) => (
              <div key={i} className="p-4 bg-slate-800 rounded flex items-center gap-2">
                <CheckCircle2 className="text-emerald-400" /> {item}
              </div>
            ))}
          </div>
        );
        export default FeatureList;
      `,
      'App.tsx': `
        import React from 'react';
        import Navbar from './Navbar';
        import Hero from './Hero';
        import { FeatureList } from './Features';

        export default function App() {
          return (
            <div className="min-h-screen bg-slate-950 text-white font-sans">
              <Navbar brand="NexSite Pro" />
              <Hero />
              <FeatureList />
            </div>
          );
        }
      `
    };

    const result = compileBundle(generatedFiles);
    expect(result.success).toBe(true);
    expect(result.executionOrder).toContain('Navbar');
    expect(result.executionOrder).toContain('Hero');
    expect(result.executionOrder).toContain('Features');
    expect(result.executionOrder[result.executionOrder.length - 1]).toBe('App');
    expect(result.srcdoc).toContain('__modules__[\'Navbar\']');
    expect(result.srcdoc).toContain('__modules__[\'Hero\']');
    expect(result.srcdoc).toContain('__modules__[\'Features\']');
    expect(result.srcdoc).toContain('__modules__[\'App\']');
    expect(result.srcdoc).toContain('IframeErrorBoundary');
    expect(result.srcdoc).toContain('LucideIcon');
    expect(result.srcdoc).toContain('"Shield"');
  });

  it('handles framer-motion and router shims cleanly without syntax errors', () => {
    const files = {
      'App.tsx': `
        import React from 'react';
        import { motion, AnimatePresence } from 'framer-motion';
        import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';

        export default function App() {
          return (
            <Router>
              <div className="p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-slate-800 rounded">
                  <h1>Router & Motion Test</h1>
                  <Link to="/about">About</Link>
                </motion.div>
              </div>
            </Router>
          );
        }
      `
    };

    const result = compileBundle(files);
    expect(result.success).toBe(true);
    expect(result.srcdoc).toContain('createMotionComponent');
    expect(result.srcdoc).toContain('MemoryRouter');
  });

  it('handles anonymous exports, named export blocks, and memoized components', () => {
    const files = {
      'Header.tsx': `
        import React, { memo } from 'react';
        const Header = ({ title = 'Default Header' }: any) => <header><h1>{title}</h1></header>;
        export default memo(Header);
      `,
      'Banner.tsx': `
        import React from 'react';
        function PromoBanner() { return <div>Special Offer!</div>; }
        export { PromoBanner as default, PromoBanner };
      `,
      'Footer.tsx': `
        import React from 'react';
        export default function() { return <footer>© 2026 NexSite</footer>; }
      `,
      'App.tsx': `
        import React from 'react';
        import Header from './header';
        import Banner from './banner';
        import Footer from './Footer';

        export default function() {
          return (
            <div>
              <Header title="My App" />
              <Banner />
              <Footer />
            </div>
          );
        }
      `
    };

    const result = compileBundle(files);
    expect(result.success).toBe(true);
    expect(result.executionOrder).toContain('Header');
    expect(result.executionOrder).toContain('Banner');
    expect(result.executionOrder).toContain('Footer');
    expect(result.executionOrder[result.executionOrder.length - 1]).toBe('App');
  });

  it('handles components with undeclared motion tags and injects motion into module scopes', () => {
    const files = {
      'Hero.tsx': `
        import React from 'react';
        export default function Hero() {
          return (
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="hero-section">
              <motion.h1>Movie Review Hub</motion.h1>
              <AnimatePresence>
                <motion.p>Discover reviews and ratings</motion.p>
              </AnimatePresence>
            </motion.div>
          );
        }
      `,
      'App.tsx': `
        import React from 'react';
        import Hero from './Hero';
        export default function App() {
          return <div><Hero /></div>;
        }
      `
    };

    const result = compileBundle(files);
    expect(result.success).toBe(true);
    expect(result.srcdoc).toContain('window.motion = motionProxy');
    expect(result.srcdoc).toContain('window.AnimatePresence = AnimatePresenceShim');
    expect(result.srcdoc).toContain('var motion = window.motion');
  });
});

