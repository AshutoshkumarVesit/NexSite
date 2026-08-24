export interface UserRequirements {
  raw_prompt: string;
  category: string;
  target_audience?: string;
  key_features: string[];
  preferred_theme?: string;
  tone?: string;
}

export interface UITheme {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontHeading: string;
  fontBody: string;
}

export interface UILayout {
  pageSections: string[];
  navbarStyle: string;
  heroStyle: string;
  cardStyle: string;
  footerStyle: string;
}

export interface UISpecification {
  theme: UITheme;
  layout: UILayout;
  components: string[];
  animations: string[];
  spacing: Record<string, string>;
  responsiveRules: Record<string, string>;
}

export interface ContentFeature {
  title: string;
  description: string;
}

export interface ContentTestimonial {
  name: string;
  role: string;
  quote: string;
}

export interface ContentMap {
  hero: {
    title: string;
    subtitle: string;
    cta: string;
  };
  about: {
    title: string;
    body: string;
  };
  features: ContentFeature[];
  testimonials: ContentTestimonial[];
  footer: {
    copyright: string;
    links: string[];
  };
}

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  openGraph: {
    title: string;
    description: string;
    type: string;
    url?: string;
    imageAlt?: string;
  };
  twitterCard: {
    card: 'summary' | 'summary_large_image';
    title: string;
    description: string;
  };
  structuredDataJSON: string;
  robotsTxt: string;
  sitemapXml: string;
  faviconMeta: string;
  manifestJson: string;
  semanticHeadings: {
    h1: string;
    h2s: string[];
  };
}

export interface PipelineLog {
  timestamp: string;
  agentName: string;
  message: string;
  level: 'info' | 'warn' | 'error';
}

export interface PipelineError {
  agentName: string;
  error: string;
  timestamp: string;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  created_at: string;
  current_step: string;
  progress_percent?: number;
  status: 'idle' | 'running' | 'completed' | 'error';
}

export interface PipelineMetrics {
  generationTimeMs: number;
  repairCount: number;
  retryCount: number;
  componentCount: number;
  cacheHits: number;
  cacheMisses: number;
  validationErrors: number;
  repairDurationMs: number;
  plannerDurationMs?: number;
  dataModelDurationMs?: number;
  parallelEfficiency?: number;
  totalDurationMs?: number;
}

export interface ComponentDefinition {
  name: string;
  purpose: string;
  props?: string[];
}

export interface ComponentDiagnostic {
  component: string;
  provider: string; // The LLM provider used
  model: string;
  rawResponseType: string; // e.g. "object", "string", "undefined"
  normalized: boolean;
  validation: 'pass' | 'fail';
  repairCount: number;
  finalSize: number;
  status: 'success' | 'fallback';
  generationTimeMs?: number;
}

export interface RendererDiagnostics {
  bundleResult: 'PASS' | 'FAIL';
  fileCount: number;
  dependencyCount: number;
  executionOrder: string[];
  errors: Array<{
    type: string;
    source?: string;
    dependency?: string;
    expectedFile?: string;
    chain?: string[];
    message: string;
  }>;
  bundleTimeMs: number;
}

export interface PipelineState {
  requirements: UserRequirements;
  ui_spec: UISpecification;
  content: ContentMap;
  seo: SEOMetadata;
  component_plan?: {
    components: ComponentDefinition[];
  };
  data_model?: Record<string, any>;
  component_diagnostics?: ComponentDiagnostic[];
  generated_files: Record<string, string>; // path -> content
  metrics?: PipelineMetrics;
  renderer_diagnostics?: RendererDiagnostics;
  project_metadata: ProjectMetadata;
  logs: PipelineLog[];
  errors: PipelineError[];
}
