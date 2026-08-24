import type { IAgent } from '../../core/interfaces/IAgent';
import type { PipelineState, ComponentDefinition } from '../../core/entities/PipelineState';
import type { ILLMProvider } from '../../core/interfaces/ILLMProvider';
import { COMPONENT_PLANNER_PROMPT } from '../../prompts/component_planner.prompt';

export class ComponentPlannerAgent implements IAgent {
  public readonly name = 'ComponentPlannerAgent';
  public readonly role = 'React Architecture & Component Planning';

  private llmProvider: ILLMProvider;

  constructor(llmProvider: ILLMProvider) {
    this.llmProvider = llmProvider;
  }

  public async execute(state: PipelineState): Promise<Partial<PipelineState>> {
    const { category, key_features } = state.requirements;
    const themeMode = state.ui_spec?.theme?.mode || 'light';

    const promptText = COMPONENT_PLANNER_PROMPT
      .replace('{raw_prompt}', state.requirements.raw_prompt || category || 'Custom Web Application')
      .replace('{category}', category || 'LandingPage')
      .replace('{key_features}', (key_features || []).join(', '))
      .replace('{theme_mode}', themeMode);

    let components: ComponentDefinition[] = [];
    let usedFallback = false;
    let retryAttempted = false;
    const timestamp = new Date().toISOString();

    try {
      const raw = await this.llmProvider.generateJSON<any>(
        promptText,
        'Component Plan JSON'
      );
      const unwrapped = (raw?.component_plan || raw?.components ? raw : (raw?.data || raw)) as any;
      components = this.validateAndNormalize(unwrapped);
    } catch (err) {
      retryAttempted = true;
      try {
        const retryPrompt = `${promptText}\n\nATTENTION: Previous response failed JSON validation. Return 100% valid JSON matching the schema containing a "components" array.`;
        const retryRaw = await this.llmProvider.generateJSON<any>(
          retryPrompt,
          'Component Plan JSON (Retry)'
        );
        const unwrappedRetry = (retryRaw?.component_plan || retryRaw?.components ? retryRaw : (retryRaw?.data || retryRaw)) as any;
        components = this.validateAndNormalize(unwrappedRetry);
      } catch (err2) {
        usedFallback = true;
        components = this.createDeterministicFallback();
      }
    }

    const logMessage = usedFallback
      ? 'Generated component plan using deterministic fallback after LLM failure/retry.'
      : `Planned ${components.length} components successfully${retryAttempted ? ' on retry' : ''}.`;

    return {
      component_plan: { components },
      project_metadata: {
        ...state.project_metadata,
        current_step: 'ComponentPlannerAgent Completed',
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

  private validateAndNormalize(raw: any): ComponentDefinition[] {
    if (!raw || !Array.isArray(raw.components) || raw.components.length === 0) {
      throw new Error('ComponentPlannerAgent Validation Error: Missing or empty components array.');
    }

    const normalized = raw.components.map((c: any) => ({
      name: (typeof c.name === 'string' && c.name.trim()) ? c.name.trim() : 'UnnamedComponent',
      purpose: (typeof c.purpose === 'string' && c.purpose.trim()) ? c.purpose.trim() : 'Unknown purpose',
      props: Array.isArray(c.props) ? c.props.map((p: any) => String(p).trim()).filter(Boolean) : []
    }));

    const seenNames = new Set<string>();
    const deduplicated: ComponentDefinition[] = [];
    for (const c of normalized) {
      const cleanName = c.name.trim().replace(/\.tsx?$/, '');
      const key = cleanName.toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        deduplicated.push({ ...c, name: cleanName });
      }
    }

    const hasApp = deduplicated.some((c: ComponentDefinition) => c.name.toLowerCase() === 'app');
    if (!hasApp) {
      deduplicated.push({ name: 'App', purpose: 'Root application component' });
    } else {
      // Ensure App is named exactly 'App' (uppercase) and placed at the end
      const appIdx = deduplicated.findIndex(c => c.name.toLowerCase() === 'app');
      if (appIdx !== -1) {
        const [appComp] = deduplicated.splice(appIdx, 1);
        deduplicated.push({ ...appComp, name: 'App' });
      }
    }

    return deduplicated;
  }

  private createDeterministicFallback(): ComponentDefinition[] {
    return [
      { name: 'Navbar', purpose: 'Main navigation', props: ['logo', 'links'] },
      { name: 'Hero', purpose: 'Landing section', props: ['title', 'subtitle', 'cta'] },
      { name: 'Features', purpose: 'Feature cards', props: ['features'] },
      { name: 'Footer', purpose: 'Footer section', props: ['copyright'] },
      { name: 'App', purpose: 'Root application component', props: [] }
    ];
  }
}
