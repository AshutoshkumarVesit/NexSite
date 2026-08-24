import type { IAgent } from '../../core/interfaces/IAgent';
import type { PipelineState, ContentMap, UserRequirements } from '../../core/entities/PipelineState';
import type { ILLMProvider } from '../../core/interfaces/ILLMProvider';
import { CONTENT_AGENT_PROMPT } from '../../prompts/content.prompt';

export class ContentAgent implements IAgent {
  public readonly name = 'ContentAgent';
  public readonly role = 'Conversion Copywriting & Messaging Architecture';

  private llmProvider: ILLMProvider;

  constructor(llmProvider: ILLMProvider) {
    this.llmProvider = llmProvider;
  }

  public async execute(state: PipelineState): Promise<Partial<PipelineState>> {
    const requirements = state.requirements;
    const projectMetadata = state.project_metadata;

    if (!requirements || !requirements.category) {
      throw new Error('ContentAgent Error: PipelineState.requirements is uninitialized.');
    }

    const promptText = CONTENT_AGENT_PROMPT
      .replace('{raw_prompt}', requirements.raw_prompt || requirements.category)
      .replace('{category}', requirements.category)
      .replace('{target_audience}', requirements.target_audience || 'General Users')
      .replace('{key_features}', (requirements.key_features || []).join(', '))
      .replace('{tone}', requirements.tone || 'bold');

    let contentMap: ContentMap;
    let usedFallback = false;
    let retryAttempted = false;

    // Attempt 1: Active LLM Provider
    try {
      const rawContent = await this.llmProvider.generateJSON<any>(
        promptText,
        'ContentMap JSON Object'
      );
      contentMap = this.validateAndNormalizeContent(rawContent, requirements);
    } catch (firstError) {
      retryAttempted = true;
      try {
        const retryPrompt = `${promptText}\n\nATTENTION: Previous response failed JSON validation. Return 100% valid JSON matching the exact schema with hero, about, features, testimonials, and footer.`;
        const retryRaw = await this.llmProvider.generateJSON<any>(
          retryPrompt,
          'ContentMap JSON Object (Retry)'
        );
        contentMap = this.validateAndNormalizeContent(retryRaw, requirements);
      } catch (secondError) {
        usedFallback = true;
        contentMap = this.createDeterministicFallback(requirements);
      }
    }

    const timestamp = new Date().toISOString();
    const logMessage = usedFallback
      ? `Generated content using category-aware deterministic fallback after LLM failure/retry.`
      : retryAttempted
      ? `Generated content successfully on retry pass.`
      : `Authored high-conversion AI copy: Hero Title="${contentMap.hero.title}".`;

    return {
      content: contentMap,
      project_metadata: {
        ...projectMetadata,
        current_step: 'ContentAgent Completed',
        status: 'running'
      },
      logs: [
        ...(state.logs || []),
        {
          timestamp,
          agentName: this.name,
          message: logMessage,
          level: usedFallback ? 'warn' : 'info'
        }
      ]
    };
  }

  private validateAndNormalizeContent(
    raw: any,
    reqs: UserRequirements
  ): ContentMap {
    if (!raw || typeof raw !== 'object') {
      throw new Error('ContentAgent Validation Error: Raw response is not an object.');
    }

    const unwrapped = (raw.content || raw.ContentMap || raw.data || raw) as Partial<ContentMap>;
    const fallback = this.createDeterministicFallback(reqs);

    const hero = {
      title: typeof unwrapped.hero?.title === 'string' && unwrapped.hero.title.trim() ? unwrapped.hero.title.trim() : fallback.hero.title,
      subtitle: typeof unwrapped.hero?.subtitle === 'string' && unwrapped.hero.subtitle.trim() ? unwrapped.hero.subtitle.trim() : fallback.hero.subtitle,
      cta: typeof unwrapped.hero?.cta === 'string' && unwrapped.hero.cta.trim() ? unwrapped.hero.cta.trim() : fallback.hero.cta
    };

    const about = {
      title: typeof unwrapped.about?.title === 'string' && unwrapped.about.title.trim() ? unwrapped.about.title.trim() : fallback.about.title,
      body: typeof unwrapped.about?.body === 'string' && unwrapped.about.body.trim() ? unwrapped.about.body.trim() : fallback.about.body
    };

    const features = Array.isArray(unwrapped.features) && unwrapped.features.length > 0
      ? unwrapped.features.map((f: any) => ({
          title: String(f?.title || f?.name || 'Feature Capability').trim(),
          description: String(f?.description || f?.desc || 'Designed for high performance and seamless experience.').trim()
        }))
      : fallback.features;

    const testimonials = Array.isArray(unwrapped.testimonials) && unwrapped.testimonials.length > 0
      ? unwrapped.testimonials.map((t: any) => ({
          name: String(t?.name || 'Verified User').trim(),
          role: String(t?.role || t?.title || 'Community Member').trim(),
          quote: String(t?.quote || t?.comment || 'Transformed our experience completely. Highly recommended!').trim()
        }))
      : fallback.testimonials;

    const footer = {
      copyright: typeof unwrapped.footer?.copyright === 'string' && unwrapped.footer.copyright.trim() ? unwrapped.footer.copyright.trim() : fallback.footer.copyright,
      links: Array.isArray(unwrapped.footer?.links) && unwrapped.footer.links.length > 0
        ? unwrapped.footer.links.map(l => String(l).trim()).filter(Boolean)
        : fallback.footer.links
    };

    return { hero, about, features, testimonials, footer };
  }

  private createDeterministicFallback(reqs: UserRequirements): ContentMap {
    const category = reqs.category;
    const lowerPrompt = (reqs.raw_prompt || '').toLowerCase();
    const isVideo = category === 'Video Streaming' || /youtube|video|stream|tube/i.test(lowerPrompt);

    if (isVideo) {
      return {
        hero: {
          title: 'Stream, Share, and Discover Millions of Videos',
          subtitle: 'Join a vibrant community of creators. Watch trending content, subscribe to channels, and stream high-definition media seamlessly.',
          cta: 'Start Watching Now'
        },
        about: {
          title: 'The Next-Generation Video Platform',
          body: 'Empowering creators worldwide with 4K ultra-fast video streaming, personalized feeds, live chat, and powerful community engagement.'
        },
        features: [
          { title: '4K Ultra-HD Video Streaming', description: 'Crystal-clear playback with adaptive bitrate and instant bufferless loading.' },
          { title: 'Personalized Video Discovery', description: 'Intelligent feed curating the latest trending music, gaming, podcasts, and tutorials.' },
          { title: 'Creator Channels & Memberships', description: 'Subscribe to channels, leave comments, and join exclusive creator communities.' }
        ],
        testimonials: [
          { name: 'Alex Rivera', role: 'Content Creator (1.2M Subs)', quote: 'The most responsive, feature-packed video sharing platform on the web.' }
        ],
        footer: {
          copyright: '© 2026 NexTube Video Network. All rights reserved.',
          links: ['Home', 'Trending', 'Subscriptions', 'Library', 'History']
        }
      };
    }

    if (category === 'Restaurant') {
      return {
        hero: {
          title: 'Artisanal Fine Dining & Seasonal Italian Bistro',
          subtitle: 'Savor handcrafted pasta, wood-fired prime steaks, and vintage wine pairings in a warm, inviting atmosphere.',
          cta: 'Reserve Your Table'
        },
        about: {
          title: 'Our Culinary Philosophy',
          body: 'Founded with a passion for traditional recipes and farm-to-table organic ingredients sourced from local growers.'
        },
        features: [
          { title: 'Truffle Tagliatelle', description: 'Fresh egg pasta tossed in black truffle cream and wild forest mushrooms.' },
          { title: 'Wood-Fired Ribeye', description: '45-day dry-aged prime beef cooked over white oak coals with garlic rosemary butter.' },
          { title: 'Artisanal Burrata', description: 'Creamy Pugliese burrata served with heirloom tomatoes and aged balsamic.' }
        ],
        testimonials: [
          { name: 'Chef Marco V', role: 'Michelin Guide Reviewer', quote: 'An exceptional culinary journey blending tradition with contemporary elegance.' }
        ],
        footer: {
          copyright: `© 2026 ${category} Bistro & Dining. All rights reserved.`,
          links: ['Home', 'Menu', 'Reservations', 'Private Dining', 'Contact']
        }
      };
    }

    if (category === 'Healthcare') {
      return {
        hero: {
          title: 'Compassionate Medical Care for Every Family',
          subtitle: 'Board-certified specialists and advanced diagnostic facilities committed to your long-term health and well-being.',
          cta: 'Book Medical Consultation'
        },
        about: {
          title: 'Trusted Community Health Center',
          body: 'Delivering patient-centered preventive screening, cardiology, and gentle pediatric care for over 15 years.'
        },
        features: [
          { title: 'Cardiology Diagnostics', description: 'Comprehensive heart screening and custom cardiovascular health plans.' },
          { title: 'Pediatric Wellness', description: 'Specialized healthcare and growth tracking for infants, children, and teens.' },
          { title: 'Neurology Screening', description: 'Advanced neurological evaluation and cognitive wellness therapy.' }
        ],
        testimonials: [
          { name: 'Dr. Sarah Jenkins', role: 'Chief of Medicine', quote: 'We treat every patient like family, prioritizing preventative wellness.' }
        ],
        footer: {
          copyright: `© 2026 ${category} Health Center. All rights reserved.`,
          links: ['Home', 'Services', 'Doctors', 'Appointments', 'Contact']
        }
      };
    }

    if (category === 'Portfolio') {
      return {
        hero: {
          title: 'Senior AI & Distributed Systems Architect',
          subtitle: 'Building high-throughput cloud infrastructure, multi-agent LLM systems, and real-time event processing platforms.',
          cta: 'Explore Featured Work'
        },
        about: {
          title: 'Engineering Approach',
          body: 'Focused on clean architecture, sub-millisecond latency, minimal dependencies, and resilient system design.'
        },
        features: [
          { title: 'Distributed Event Streaming', description: 'Go and Kafka message broker handling 50k+ events/sec with sub-millisecond latency.' },
          { title: 'Autonomous Multi-Agent Engine', description: 'LangGraph workflow engine generating production-ready React layouts.' },
          { title: 'Fintech Real-Time Analytics', description: 'High-frequency financial metrics dashboard built with TypeScript & Node.' }
        ],
        testimonials: [
          { name: 'Elena Rostova', role: 'VP of Engineering', quote: 'Architected our event streaming pipeline with zero downtime.' }
        ],
        footer: {
          copyright: `© 2026 Senior Engineering Portfolio. Built with Clean Code.`,
          links: ['Projects', 'Experience', 'Stack', 'Contact']
        }
      };
    }

    if (category === 'Agency') {
      return {
        hero: {
          title: 'Driving Digital Transformation & Brand Innovation',
          subtitle: 'Full-service creative agency crafting category-defining visual identities, web applications, and growth campaigns.',
          cta: 'Initiate Studio Project'
        },
        about: {
          title: 'Creative Studio Vision',
          body: 'Partnering with ambitious founders and global enterprises to build memorable digital products.'
        },
        features: [
          { title: 'Brand Strategy & Identity', description: 'Design tokens, typography systems, and visual guidelines.' },
          { title: 'Full-Stack Web Engineering', description: 'High-performance React and Next.js platforms optimized for conversion.' },
          { title: 'Digital Growth Strategy', description: 'Data-driven marketing campaigns and SEO optimization.' }
        ],
        testimonials: [
          { name: 'Jonathan Vance', role: 'CEO @ TechPulse', quote: 'Delivered an exceptional brand identity that doubled our enterprise pipeline.' }
        ],
        footer: {
          copyright: `© 2026 ${category} Creative Studio. All rights reserved.`,
          links: ['Work', 'Services', 'About', 'Inquire']
        }
      };
    }

    if (category === 'E-Commerce') {
      return {
        hero: {
          title: 'Curated Premium Workspace Essentials',
          subtitle: 'Discover exclusive mechanical keyboards, CNC machined stands, and sustainable desk accessories.',
          cta: 'Shop New Arrivals'
        },
        about: {
          title: 'Crafted for Creators',
          body: 'Precision engineered with anodized aluminum and sustainable materials for modern workspace aesthetics.'
        },
        features: [
          { title: 'Wireless Mechanical Keyboard', description: 'Hot-swappable custom switches with RGB ambient backlighting.' },
          { title: 'CNC Headphones Stand', description: 'Precision machined aluminum stand with cable management slot.' },
          { title: 'Ergonomic Executive Desk Mat', description: 'Waterproof vegan leather mat with stitched anti-fray edges.' }
        ],
        testimonials: [
          { name: 'David Kim', role: 'Verified Customer', quote: 'Outstanding build quality and express shipping. Upgraded my workspace instantly!' }
        ],
        footer: {
          copyright: `© 2026 ${category} Essentials Inc. All rights reserved.`,
          links: ['Shop', 'Categories', 'Deals', 'Support']
        }
      };
    }

    if (category === 'Crypto') {
      return {
        hero: {
          title: 'Real-Time Web3 & Crypto Intelligence Dashboard',
          subtitle: 'Institutional-grade decentralized analytics platform tracking live token liquidity, node metrics, and yield pools.',
          cta: 'Connect Web3 Wallet'
        },
        about: {
          title: 'Web3 Infrastructure',
          body: 'Sub-second block telemetry, multi-sig cold storage vaults, and 99.99% mainnet validator uptime.'
        },
        features: [
          { title: 'Live Token Market Cap Grid', description: 'Real-time telemetry for BTC, ETH, SOL, and top ERC-20 tokens.' },
          { title: 'Validator Node Statistics', description: '12,450 active nodes with sub-second gas tracking.' },
          { title: 'Multi-Sig Vault Security', description: 'CertiK audited smart contracts and zero-knowledge encryption.' }
        ],
        testimonials: [
          { name: 'Satoshi S', role: 'DeFi Analyst', quote: 'Unmatched real-time telemetry for liquidity pools.' }
        ],
        footer: {
          copyright: `© 2026 ${category} Intelligence Labs. All rights reserved.`,
          links: ['Markets', 'Nodes', 'Staking', 'Audit']
        }
      };
    }

    // Default SaaS Fallback
    return {
      hero: {
        title: `Scale Autonomous ${category} Systems in Seconds`,
        subtitle: 'Empower your development team with continuous workflow orchestration, real-time analytics, and instant deployments.',
        cta: 'Start Free Trial'
      },
      about: {
        title: 'Built for Enterprise Reliability',
        body: 'Engineered for high throughput, sub-millisecond response times, and 99.99% operational SLA.'
      },
      features: [
        { title: 'Autonomous Agent Pipeline', description: 'LangGraph StateGraph workflow engine coordinating specialist nodes.' },
        { title: 'UI UX Pro Design Systems', description: 'Accessible contrast ratios, dynamic dark mode, and micro-interactions.' },
        { title: 'Enterprise Security & SLA', description: 'SOC2 compliant infrastructure with automated backup redundancy.' }
      ],
      testimonials: [
        { name: 'Alex Rivera', role: 'CTO @ CloudMatrix', quote: 'Accelerated our web app product delivery by 10x with flawless clean code.' }
      ],
      footer: {
        copyright: `© 2026 ${category} Engine Inc. All rights reserved.`,
        links: ['Home', 'Features', 'Solutions', 'Pricing', 'Contact']
      }
    };
  }
}
