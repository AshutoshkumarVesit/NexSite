import type { IAgent } from '../../core/interfaces/IAgent';
import type { PipelineState, SEOMetadata } from '../../core/entities/PipelineState';
import type { ILLMProvider } from '../../core/interfaces/ILLMProvider';
import { SEO_AGENT_PROMPT } from '../../prompts/seo.prompt';

export class SEOAgent implements IAgent {
  public readonly name = 'SEOAgent';
  public readonly role = 'Search Optimization, OpenGraph, Twitter Card & Schema Generation';

  private llmProvider: ILLMProvider;

  constructor(llmProvider: ILLMProvider) {
    this.llmProvider = llmProvider;
  }

  public async execute(state: PipelineState): Promise<Partial<PipelineState>> {
    const { category, key_features, target_audience } = state.requirements;
    const heroTitle = state.content?.hero?.title || 'Web Application';
    const siteDescription = state.content?.hero?.subtitle || state.content?.about?.body || '';

    const promptText = SEO_AGENT_PROMPT
      .replace('{raw_prompt}', state.requirements.raw_prompt || category || 'Custom Application')
      .replace('{category}', category || 'LandingPage')
      .replace('{hero_title}', heroTitle)
      .replace('{site_description}', siteDescription)
      .replace('{key_features}', (key_features || []).join(', '))
      .replace('{target_audience}', target_audience || 'General Users');

    let seoData: SEOMetadata;
    let usedFallback = false;
    let retryAttempted = false;

    // Attempt 1: LLM generation
    try {
      const raw = await this.llmProvider.generateJSON<Partial<SEOMetadata>>(
        promptText,
        'SEO Metadata JSON'
      );
      seoData = this.validateAndNormalize(raw, category, heroTitle);
    } catch (firstError) {
      retryAttempted = true;
      // Attempt 2: Retry with stricter instruction
      try {
        const retryPrompt = `${promptText}\n\nATTENTION: Previous response failed JSON validation. Return 100% valid JSON matching the exact schema with title, description, keywords, canonicalUrl, openGraph, twitterCard, structuredDataJSON, robotsTxt, sitemapXml, faviconMeta, manifestJson, and semanticHeadings.`;
        const retryRaw = await this.llmProvider.generateJSON<Partial<SEOMetadata>>(
          retryPrompt,
          'SEO Metadata JSON (Retry)'
        );
        seoData = this.validateAndNormalize(retryRaw, category, heroTitle);
      } catch (secondError) {
        usedFallback = true;
        seoData = this.createDeterministicFallback(category, heroTitle, siteDescription, key_features);
      }
    }

    const timestamp = new Date().toISOString();
    const logMessage = usedFallback
      ? `Generated SEO metadata using deterministic fallback after LLM failure/retry.`
      : retryAttempted
      ? `Generated SEO metadata successfully on retry pass.`
      : `Generated SEO: title="${seoData.title}", ${seoData.keywords.length} keywords, OG+Twitter+JSON-LD.`;

    return {
      seo: seoData,
      project_metadata: {
        ...state.project_metadata,
        current_step: 'SEOAgent Completed',
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

  private validateAndNormalize(
    raw: Partial<SEOMetadata>,
    category: string,
    heroTitle: string
  ): SEOMetadata {
    if (!raw || typeof raw !== 'object') {
      throw new Error('SEOAgent Validation Error: Raw response is not an object.');
    }

    const fallback = this.createDeterministicFallback(category, heroTitle, '', []);

    const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : fallback.title;
    const description = typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : fallback.description;
    const keywords = Array.isArray(raw.keywords) && raw.keywords.length > 0
      ? raw.keywords.map(k => String(k).trim()).filter(Boolean)
      : fallback.keywords;
    const canonicalUrl = typeof raw.canonicalUrl === 'string' && raw.canonicalUrl.trim() ? raw.canonicalUrl.trim() : fallback.canonicalUrl;

    const openGraph = {
      title: typeof raw.openGraph?.title === 'string' && raw.openGraph.title.trim() ? raw.openGraph.title.trim() : title,
      description: typeof raw.openGraph?.description === 'string' && raw.openGraph.description.trim() ? raw.openGraph.description.trim() : description,
      type: typeof raw.openGraph?.type === 'string' && raw.openGraph.type.trim() ? raw.openGraph.type.trim() : 'website',
      url: typeof raw.openGraph?.url === 'string' ? raw.openGraph.url.trim() : canonicalUrl,
      imageAlt: typeof raw.openGraph?.imageAlt === 'string' ? raw.openGraph.imageAlt.trim() : `${title} preview`
    };

    const twitterCard = {
      card: (raw.twitterCard?.card === 'summary' || raw.twitterCard?.card === 'summary_large_image')
        ? raw.twitterCard.card
        : 'summary_large_image' as const,
      title: typeof raw.twitterCard?.title === 'string' && raw.twitterCard.title.trim() ? raw.twitterCard.title.trim() : title,
      description: typeof raw.twitterCard?.description === 'string' && raw.twitterCard.description.trim() ? raw.twitterCard.description.trim() : description
    };

    const structuredDataJSON = typeof raw.structuredDataJSON === 'string' && raw.structuredDataJSON.trim()
      ? raw.structuredDataJSON.trim()
      : fallback.structuredDataJSON;

    const robotsTxt = typeof raw.robotsTxt === 'string' && raw.robotsTxt.trim()
      ? raw.robotsTxt.trim()
      : fallback.robotsTxt;

    const sitemapXml = typeof raw.sitemapXml === 'string' && raw.sitemapXml.trim()
      ? raw.sitemapXml.trim()
      : fallback.sitemapXml;

    const faviconMeta = typeof raw.faviconMeta === 'string' && raw.faviconMeta.trim()
      ? raw.faviconMeta.trim()
      : fallback.faviconMeta;

    const manifestJson = typeof raw.manifestJson === 'string' && raw.manifestJson.trim()
      ? raw.manifestJson.trim()
      : fallback.manifestJson;

    const semanticHeadings = {
      h1: typeof raw.semanticHeadings?.h1 === 'string' && raw.semanticHeadings.h1.trim()
        ? raw.semanticHeadings.h1.trim() : heroTitle,
      h2s: Array.isArray(raw.semanticHeadings?.h2s) && raw.semanticHeadings.h2s.length > 0
        ? raw.semanticHeadings.h2s.map(h => String(h).trim()).filter(Boolean)
        : fallback.semanticHeadings.h2s
    };

    return {
      title, description, keywords, canonicalUrl,
      openGraph, twitterCard, structuredDataJSON,
      robotsTxt, sitemapXml, faviconMeta, manifestJson,
      semanticHeadings
    };
  }

  private createDeterministicFallback(
    category: string,
    heroTitle: string,
    siteDescription: string,
    keyFeatures: string[]
  ): SEOMetadata {
    const siteName = `${category} | NexSite`;
    const desc = siteDescription || `Discover ${category.toLowerCase()} solutions. ${heroTitle}`;
    const truncatedDesc = desc.length > 160 ? desc.slice(0, 157) + '...' : desc;
    const kw = keyFeatures && keyFeatures.length > 0
      ? keyFeatures.slice(0, 5).map(k => k.toLowerCase())
      : [category.toLowerCase(), 'web application', 'modern design', 'responsive', 'professional'];

    return {
      title: heroTitle.length > 60 ? heroTitle.slice(0, 57) + '...' : heroTitle,
      description: truncatedDesc,
      keywords: kw,
      canonicalUrl: `https://${category.toLowerCase().replace(/\s+/g, '-')}.nexsite.app/`,
      openGraph: {
        title: heroTitle,
        description: truncatedDesc,
        type: 'website',
        url: `https://${category.toLowerCase().replace(/\s+/g, '-')}.nexsite.app/`,
        imageAlt: `${siteName} preview screenshot`
      },
      twitterCard: {
        card: 'summary_large_image',
        title: heroTitle,
        description: truncatedDesc
      },
      structuredDataJSON: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'name': heroTitle,
        'description': truncatedDesc,
        'url': `https://${category.toLowerCase().replace(/\s+/g, '-')}.nexsite.app/`
      }),
      robotsTxt: `User-agent: *\nAllow: /\nSitemap: https://${category.toLowerCase().replace(/\s+/g, '-')}.nexsite.app/sitemap.xml`,
      sitemapXml: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://${category.toLowerCase().replace(/\s+/g, '-')}.nexsite.app/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>`,
      faviconMeta: '<link rel="icon" href="/favicon.ico" /><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
      manifestJson: JSON.stringify({
        name: siteName,
        short_name: category,
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#6366f1',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }]
      }),
      semanticHeadings: {
        h1: heroTitle,
        h2s: ['Features', 'Testimonials', 'Get Started']
      }
    };
  }
}
