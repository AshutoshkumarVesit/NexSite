import type { IAgent } from '../../core/interfaces/IAgent';
import type { PipelineState, UISpecification, UserRequirements } from '../../core/entities/PipelineState';
import type { ILLMProvider } from '../../core/interfaces/ILLMProvider';
import { UI_AGENT_PROMPT } from '../../prompts/ui.prompt';

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3,8})$/;

export class UIAgent implements IAgent {
  public readonly name = 'UIAgent';
  public readonly role = 'UI UX Pro Design System & Theme Engine';

  private llmProvider: ILLMProvider;

  constructor(llmProvider: ILLMProvider) {
    this.llmProvider = llmProvider;
  }

  public async execute(state: PipelineState): Promise<Partial<PipelineState>> {
    const requirements = state.requirements;
    const projectMetadata = state.project_metadata;

    if (!requirements || !requirements.category) {
      throw new Error('UIAgent Error: PipelineState.requirements is uninitialized.');
    }

    const promptText = UI_AGENT_PROMPT
      .replace('{raw_prompt}', requirements.raw_prompt || requirements.category)
      .replace('{category}', requirements.category)
      .replace('{tone}', requirements.tone || 'bold')
      .replace('{preferred_theme}', requirements.preferred_theme || 'dark')
      .replace('{target_audience}', requirements.target_audience || 'General Users')
      .replace('{key_features}', (requirements.key_features || []).join(', '));

    let uiSpec: UISpecification;
    let usedFallback = false;
    let retryAttempted = false;

    try {
      const rawSpec = await this.llmProvider.generateJSON<any>(
        promptText,
        'UISpecification JSON Object'
      );
      const unwrapped = (rawSpec?.ui_spec || rawSpec?.UISpecification || rawSpec?.data || rawSpec) as Partial<UISpecification>;
      uiSpec = this.validateAndNormalizeUISpec(unwrapped, requirements);
    } catch (firstError) {
      retryAttempted = true;
      try {
        const retryPrompt = `${promptText}\n\nATTENTION: The previous response failed JSON validation. Ensure absolute 100% compliance with JSON syntax without any markdown text.`;
        const retryRawSpec = await this.llmProvider.generateJSON<Partial<UISpecification>>(
          retryPrompt,
          'UISpecification JSON Object (Retry)'
        );
        uiSpec = this.validateAndNormalizeUISpec(retryRawSpec, requirements);
      } catch (secondError) {
        usedFallback = true;
        uiSpec = this.createDeterministicFallback(requirements);
      }
    }

    const timestamp = new Date().toISOString();
    const logMessage = usedFallback
      ? `Generated ui_spec using category-aware deterministic fallback after LLM validation retry.`
      : retryAttempted
      ? `Generated ui_spec successfully on retry pass.`
      : `Generated UI UX Pro ui_spec with category="${requirements.category}", mode="${uiSpec.theme.mode}", primaryColor="${uiSpec.theme.primaryColor}".`;

    return {
      ui_spec: uiSpec,
      project_metadata: {
        ...projectMetadata,
        current_step: 'UIAgent Completed',
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

  private validateAndNormalizeUISpec(
    raw: Partial<UISpecification>,
    reqs: UserRequirements
  ): UISpecification {
    if (!raw || typeof raw !== 'object') {
      throw new Error('UIAgent Validation Error: Raw response is not an object.');
    }

    const fallback = this.createDeterministicFallback(reqs);

    const mode: 'light' | 'dark' = raw.theme?.mode === 'light' || raw.theme?.mode === 'dark'
      ? raw.theme.mode
      : fallback.theme.mode;

    const primaryColor = this.isValidHex(raw.theme?.primaryColor)
      ? raw.theme!.primaryColor
      : fallback.theme.primaryColor;

    const secondaryColor = this.isValidHex(raw.theme?.secondaryColor)
      ? raw.theme!.secondaryColor
      : fallback.theme.secondaryColor;

    const accentColor = this.isValidHex(raw.theme?.accentColor)
      ? raw.theme!.accentColor
      : fallback.theme.accentColor;

    const backgroundColor = this.isValidHex(raw.theme?.backgroundColor)
      ? raw.theme!.backgroundColor
      : fallback.theme.backgroundColor;

    const textColor = this.isValidHex(raw.theme?.textColor)
      ? raw.theme!.textColor
      : fallback.theme.textColor;

    const fontHeading = typeof raw.theme?.fontHeading === 'string' && raw.theme.fontHeading.trim()
      ? raw.theme.fontHeading.trim()
      : fallback.theme.fontHeading;

    const fontBody = typeof raw.theme?.fontBody === 'string' && raw.theme.fontBody.trim()
      ? raw.theme.fontBody.trim()
      : fallback.theme.fontBody;

    const pageSections = Array.isArray(raw.layout?.pageSections) && raw.layout.pageSections.length > 0
      ? raw.layout.pageSections.map(s => String(s).trim()).filter(Boolean)
      : fallback.layout.pageSections;

    const navbarStyle = typeof raw.layout?.navbarStyle === 'string' && raw.layout.navbarStyle.trim()
      ? raw.layout.navbarStyle.trim()
      : fallback.layout.navbarStyle;

    const heroStyle = typeof raw.layout?.heroStyle === 'string' && raw.layout.heroStyle.trim()
      ? raw.layout.heroStyle.trim()
      : fallback.layout.heroStyle;

    const cardStyle = typeof raw.layout?.cardStyle === 'string' && raw.layout.cardStyle.trim()
      ? raw.layout.cardStyle.trim()
      : fallback.layout.cardStyle;

    const footerStyle = typeof raw.layout?.footerStyle === 'string' && raw.layout.footerStyle.trim()
      ? raw.layout.footerStyle.trim()
      : fallback.layout.footerStyle;

    const components = Array.isArray(raw.components) && raw.components.length > 0
      ? raw.components.map(c => String(c).trim()).filter(Boolean)
      : fallback.components;

    const animations = Array.isArray(raw.animations) && raw.animations.length > 0
      ? raw.animations.map(a => String(a).trim()).filter(Boolean)
      : fallback.animations;

    const spacing = raw.spacing && typeof raw.spacing === 'object'
      ? {
          sectionPadding: String(raw.spacing.sectionPadding || fallback.spacing.sectionPadding),
          containerWidth: String(raw.spacing.containerWidth || fallback.spacing.containerWidth),
          cardPadding: String(raw.spacing.cardPadding || fallback.spacing.cardPadding),
          gridGap: String(raw.spacing.gridGap || fallback.spacing.gridGap)
        }
      : fallback.spacing;

    const responsiveRules = raw.responsiveRules && typeof raw.responsiveRules === 'object'
      ? {
          mobile: String(raw.responsiveRules.mobile || fallback.responsiveRules.mobile),
          tablet: String(raw.responsiveRules.tablet || fallback.responsiveRules.tablet),
          desktop: String(raw.responsiveRules.desktop || fallback.responsiveRules.desktop)
        }
      : fallback.responsiveRules;

    return {
      theme: {
        mode,
        primaryColor,
        secondaryColor,
        accentColor,
        backgroundColor,
        textColor,
        fontHeading,
        fontBody
      },
      layout: {
        pageSections,
        navbarStyle,
        heroStyle,
        cardStyle,
        footerStyle
      },
      components,
      animations,
      spacing,
      responsiveRules
    };
  }

  private isValidHex(color?: string): boolean {
    if (!color || typeof color !== 'string') return false;
    return HEX_COLOR_REGEX.test(color.trim());
  }

  private createDeterministicFallback(reqs: UserRequirements): UISpecification {
    const category = reqs.category;
    const isDark = reqs.preferred_theme !== 'light';

    if (category === 'Crypto') {
      return {
        theme: {
          mode: 'dark',
          primaryColor: '#06B6D4',
          secondaryColor: '#8B5CF6',
          accentColor: '#10B981',
          backgroundColor: '#0F172A',
          textColor: '#F8FAFC',
          fontHeading: 'Space Grotesk, sans-serif',
          fontBody: 'Inter, sans-serif'
        },
        layout: {
          pageSections: ['Navbar', 'Hero', 'Markets', 'Nodes', 'Staking', 'Footer'],
          navbarStyle: 'crypto-glassmorphism',
          heroStyle: 'web3-ticker-hero',
          cardStyle: 'live-asset-card',
          footerStyle: 'web3-vault-footer'
        },
        components: ['TickerBar', 'HeaderNav', 'HeroBanner', 'MarketGrid', 'NodeStats', 'SecurityVaults', 'Footer'],
        animations: ['fade-in-up', 'cyan-glow-pulse'],
        spacing: { sectionPadding: 'py-20 px-6', containerWidth: 'max-w-7xl mx-auto', cardPadding: 'p-6', gridGap: 'gap-6' },
        responsiveRules: { mobile: 'flex flex-col text-center px-4', tablet: 'md:grid-cols-2 text-left', desktop: 'lg:grid-cols-4 lg:px-8' }
      };
    }

    if (category === 'Restaurant') {
      return {
        theme: {
          mode: 'dark',
          primaryColor: '#D97706',
          secondaryColor: '#B45309',
          accentColor: '#F59E0B',
          backgroundColor: '#0F172A',
          textColor: '#F8FAFC',
          fontHeading: 'Playfair Display, serif',
          fontBody: 'Inter, sans-serif'
        },
        layout: {
          pageSections: ['Navbar', 'Hero', 'Menu', 'Reservations', 'Footer'],
          navbarStyle: 'ambient-glassmorphism',
          heroStyle: 'centered-dining-hero',
          cardStyle: 'bistro-menu-card',
          footerStyle: 'warm-centered-footer'
        },
        components: ['HeaderNav', 'HeroBanner', 'MenuGrid', 'ReservationForm', 'Footer'],
        animations: ['fade-in-up', 'amber-glow-pulse'],
        spacing: { sectionPadding: 'py-20 px-6', containerWidth: 'max-w-6xl mx-auto', cardPadding: 'p-6', gridGap: 'gap-6' },
        responsiveRules: { mobile: 'flex flex-col text-center px-4', tablet: 'md:grid-cols-2 text-left', desktop: 'lg:grid-cols-3 lg:px-8' }
      };
    }

    if (category === 'Healthcare') {
      return {
        theme: {
          mode: 'light',
          primaryColor: '#059669',
          secondaryColor: '#0D9488',
          accentColor: '#10B981',
          backgroundColor: '#FFFFFF',
          textColor: '#0F172A',
          fontHeading: 'Plus Jakarta Sans, sans-serif',
          fontBody: 'Inter, sans-serif'
        },
        layout: {
          pageSections: ['Navbar', 'Hero', 'Services', 'Doctors', 'Appointments', 'Footer'],
          navbarStyle: 'clean-white-header',
          heroStyle: 'split-doctor-hero',
          cardStyle: 'clinical-specialty-card',
          footerStyle: 'trustee-footer'
        },
        components: ['HeaderNav', 'HeroBanner', 'SpecialtyGrid', 'DoctorCard', 'AppointmentBooking', 'Footer'],
        animations: ['fade-in-up', 'emerald-glow-subtle'],
        spacing: { sectionPadding: 'py-20 px-6', containerWidth: 'max-w-7xl mx-auto', cardPadding: 'p-6', gridGap: 'gap-8' },
        responsiveRules: { mobile: 'flex flex-col text-center px-4', tablet: 'md:grid-cols-2 text-left', desktop: 'lg:grid-cols-3 lg:px-8' }
      };
    }

    if (category === 'Portfolio') {
      return {
        theme: {
          mode: 'dark',
          primaryColor: '#6366F1',
          secondaryColor: '#8B5CF6',
          accentColor: '#EC4899',
          backgroundColor: '#0F172A',
          textColor: '#F8FAFC',
          fontHeading: 'Fira Code, monospace',
          fontBody: 'Inter, sans-serif'
        },
        layout: {
          pageSections: ['Navbar', 'Hero', 'Projects', 'Skills', 'Contact', 'Footer'],
          navbarStyle: 'minimal-console-nav',
          heroStyle: 'developer-terminal-hero',
          cardStyle: 'project-case-study-card',
          footerStyle: 'minimal-code-footer'
        },
        components: ['HeaderNav', 'TerminalHero', 'ProjectGrid', 'TechStackBadges', 'ContactCTA', 'Footer'],
        animations: ['fade-in-up', 'indigo-glow-pulse'],
        spacing: { sectionPadding: 'py-20 px-6', containerWidth: 'max-w-6xl mx-auto', cardPadding: 'p-6', gridGap: 'gap-6' },
        responsiveRules: { mobile: 'flex flex-col text-center px-4', tablet: 'md:grid-cols-2 text-left', desktop: 'lg:grid-cols-3 lg:px-8' }
      };
    }

    return {
      theme: {
        mode: isDark ? 'dark' : 'light',
        primaryColor: isDark ? '#7C3AED' : '#6D28D9',
        secondaryColor: isDark ? '#6366F1' : '#4F46E5',
        accentColor: isDark ? '#EC4899' : '#DB2777',
        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
        textColor: isDark ? '#F8FAFC' : '#0F172A',
        fontHeading: 'Inter, sans-serif',
        fontBody: 'Inter, sans-serif'
      },
      layout: {
        pageSections: ['Navbar', 'Hero', 'Features', 'Solutions', 'Pricing', 'Footer'],
        navbarStyle: 'sticky-glassmorphism',
        heroStyle: 'split-gradient-hero',
        cardStyle: 'elevated-dark-card',
        footerStyle: 'minimal-centered-footer'
      },
      components: ['HeaderNav', 'HeroBanner', 'FeatureCardGrid', 'PricingCard', 'Footer'],
      animations: ['fade-in-up', 'hover-scale-105', 'purple-glow-pulse'],
      spacing: { sectionPadding: 'py-24 px-6', containerWidth: 'max-w-7xl mx-auto', cardPadding: 'p-6', gridGap: 'gap-8' },
      responsiveRules: { mobile: 'flex flex-col text-center px-4', tablet: 'md:grid-cols-2 text-left', desktop: 'lg:grid-cols-3 lg:px-8' }
    };
  }
}
