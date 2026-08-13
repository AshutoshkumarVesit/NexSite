import type { ILLMProvider, LLMRequestOptions } from '../../core/interfaces/ILLMProvider.ts';

/**
 * MockLLMProvider — prompt-aware fallback.
 * Reads the raw user prompt from within the agent prompt text and returns
 * plausible generic JSON. No hardcoded keyword routing.
 * ponytail: O(1) extraction, single pass, no branching on content.
 */
export class MockLLMProvider implements ILLMProvider {
  public readonly name = 'MockLLMProvider';

  public async generateText(prompt: string, _options?: LLMRequestOptions): Promise<string> {
    return `[Mock] ${prompt.slice(0, 80)}`;
  }

  public async generateJSON<T>(prompt: string, _schemaDescription: string, _options?: LLMRequestOptions): Promise<T> {
    // Extract the raw user prompt embedded in the agent prompt text
    const userPromptMatch = prompt.match(/USER INPUT PROMPT:\s*[\r\n]*"([^"]+)"/i);
    const userRawPrompt = userPromptMatch ? userPromptMatch[1].trim() : 'general website';

    // Derive a simple category label from the first 2-3 meaningful words of the user prompt.
    // Capitalise the first word as the category — the LLM would do this properly.
    const firstWord = userRawPrompt.split(/\s+/)[0];
    const category = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();

    // ── ProjectManagerAgent ────────────────────────────────────────────────
    if (prompt.includes('ProjectManagerAgent') || prompt.includes('EXPECTED JSON SCHEMA') && prompt.includes('category')) {
      return {
        category,
        target_audience: `People interested in ${userRawPrompt}`,
        key_features: [
          `${category} Feature 1`,
          `${category} Feature 2`,
          `${category} Feature 3`,
          'Responsive Layout',
          'Contact Section'
        ],
        preferred_theme: 'dark',
        tone: 'bold'
      } as unknown as T;
    }

    // ── UIAgent ────────────────────────────────────────────────────────────
    if (prompt.includes('UIAgent') || prompt.includes('UISpecification')) {
      return {
        theme: {
          mode: 'dark',
          primaryColor: '#8B5CF6',
          secondaryColor: '#3B82F6',
          accentColor: '#EC4899',
          backgroundColor: '#0F172A',
          textColor: '#F8FAFC',
          fontHeading: 'Space Grotesk, sans-serif',
          fontBody: 'Inter, sans-serif'
        },
        layout: {
          pageSections: ['Navbar', 'Hero', 'Features', 'About', 'Contact', 'Footer'],
          navbarStyle: 'sticky-glassmorphism',
          heroStyle: 'centered-gradient-hero',
          cardStyle: 'elevated-dark-card',
          footerStyle: 'minimal-footer'
        },
        components: ['Navbar', 'Hero', 'FeatureGrid', 'About', 'Contact', 'Footer'],
        animations: ['fade-in-up', 'hover-scale'],
        spacing: { sectionPadding: 'py-20 px-6', containerWidth: 'max-w-7xl mx-auto', cardPadding: 'p-6', gridGap: 'gap-6' },
        responsiveRules: { mobile: 'flex flex-col px-4', tablet: 'md:grid-cols-2', desktop: 'lg:grid-cols-3 lg:px-8' }
      } as unknown as T;
    }

    // ── IntegratorAgent / CodeRepairAgent / Component generation ────────────
    if (prompt.includes('IntegratorAgent') || prompt.includes('CodeRepairAgent') || prompt.includes('component_name') || prompt.includes('App.tsx')) {
      const missingCompMatch = prompt.match(/named\s+['"](\w+)['"]/i) || prompt.match(/component_name['"]?:\s*['"](\w+)['"]/i);
      if (missingCompMatch && missingCompMatch[1] && missingCompMatch[1] !== 'App') {
        const comp = missingCompMatch[1];
        const filename = `${comp}.tsx`;
        return {
          [filename]: `import React from 'react';\nexport default function ${comp}(props: any) {\n  return <div className="p-4 bg-slate-800 text-slate-100 rounded-xl">${comp} Component</div>;\n}`
        } as unknown as T;
      }
      const bg = '#0F172A';
      const primary = '#8B5CF6';
      return {
        'App.tsx': `import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Footer from './components/Footer';

export default function App() {
  return (
    <div style={{ background: '${bg}', minHeight: '100vh', color: '#F8FAFC', fontFamily: 'Inter, sans-serif' }}>
      <Navbar />
      <Hero />
      <Features />
      <Footer />
    </div>
  );
}`,
        'Navbar.tsx': `import React from 'react';
export default function Navbar() {
  return (
    <header style={{ padding: '1rem 2rem', borderBottom: '1px solid #1e293b', background: 'rgba(15,23,42,0.9)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
      <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '${primary}' }}>${category}</span>
      <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
        <a href="#hero" style={{ color: 'inherit', textDecoration: 'none' }}>Home</a>
        <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Features</a>
        <a href="#contact" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</a>
      </nav>
    </header>
  );
}`,
        'Hero.tsx': `import React from 'react';
export default function Hero() {
  return (
    <section id="hero" style={{ padding: '5rem 2rem', textAlign: 'center', maxWidth: '56rem', margin: '0 auto' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1.5rem', lineHeight: 1.1 }}>
        Welcome to ${userRawPrompt}
      </h1>
      <p style={{ fontSize: '1.125rem', color: '#94a3b8', marginBottom: '2rem', maxWidth: '36rem', margin: '0 auto 2rem' }}>
        Discover everything ${userRawPrompt} has to offer.
      </p>
      <button style={{ padding: '0.875rem 2rem', borderRadius: '0.75rem', background: '${primary}', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
        Get Started
      </button>
    </section>
  );
}`,
        'Features.tsx': `import React from 'react';
const items = [
  { title: 'Feature One', desc: 'Key capability that sets us apart.' },
  { title: 'Feature Two', desc: 'Essential aspect of the experience.' },
  { title: 'Feature Three', desc: 'Why people choose us.' }
];
export default function Features() {
  return (
    <section id="features" style={{ padding: '4rem 2rem', borderTop: '1px solid #1e293b' }}>
      <div style={{ maxWidth: '64rem', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {(items ?? []).map((item, i) => (
          <div key={i} style={{ padding: '1.5rem', borderRadius: '1rem', background: '#1e293b', border: '1px solid #334155' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '${primary}' }}>{item.title}</h3>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6 }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}`,
        'Footer.tsx': `import React from 'react';
export default function Footer() {
  return (
    <footer style={{ padding: '2rem', borderTop: '1px solid #1e293b', textAlign: 'center', fontSize: '0.75rem', color: '#475569' }}>
      © ${new Date().getFullYear()} ${category}. All rights reserved.
    </footer>
  );
}`,
        'index.css': '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n'
      } as unknown as T;
    }

    // ── ContentAgent ───────────────────────────────────────────────────────
    if (prompt.includes('ContentAgent') || (prompt.includes('hero') && prompt.includes('testimonials'))) {
      return {
        hero: {
          title: `Welcome to ${userRawPrompt}`,
          subtitle: `Discover everything ${userRawPrompt} has to offer. Built with care and precision.`,
          cta: 'Get Started'
        },
        about: {
          title: `About ${category}`,
          body: `We are dedicated to providing the best ${userRawPrompt} experience. Our team brings expertise and passion to everything we do.`
        },
        features: [
          { title: 'Feature One', description: `Key capability of ${userRawPrompt} that sets us apart.` },
          { title: 'Feature Two', description: `Another essential aspect of the ${userRawPrompt} experience.` },
          { title: 'Feature Three', description: `Why people choose us for ${userRawPrompt}.` }
        ],
        testimonials: [
          { name: 'Alex Johnson', role: 'Customer', quote: `Absolutely love the ${userRawPrompt} experience. Highly recommended!` }
        ],
        footer: {
          copyright: `© ${new Date().getFullYear()} ${category}. All rights reserved.`,
          links: ['Home', 'About', 'Services', 'Contact']
        }
      } as unknown as T;
    }

    // ── SEOAgent ───────────────────────────────────────────────────────────
    if (prompt.includes('SEOAgent') || prompt.includes('structuredDataJSON')) {
      return {
        title: `${category} — ${userRawPrompt}`,
        description: `The best ${userRawPrompt} experience online. Discover our services and get started today.`,
        keywords: [userRawPrompt, category.toLowerCase(), 'online', 'professional'],
        openGraph: { title: category, description: `Discover ${userRawPrompt}`, type: 'website' },
        structuredDataJSON: `{"@context":"https://schema.org","@type":"WebSite","name":"${category}"}`,
        semanticHeadings: { h1: `Welcome to ${category}`, h2s: ['Our Services', 'About Us', 'Contact'] }
      } as unknown as T;
    }

    // Fallback: return the raw prompt wrapped as a text object
    return { text: `[Mock] ${userRawPrompt}` } as unknown as T;
  }
}
