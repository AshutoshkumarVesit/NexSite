import type { IAgent } from '../../core/interfaces/IAgent';
import type { PipelineState, UserRequirements } from '../../core/entities/PipelineState';
import type { ILLMProvider } from '../../core/interfaces/ILLMProvider';
import { PROJECT_MANAGER_PROMPT } from '../../prompts/project_manager.prompt';

export class ProjectManagerAgent implements IAgent {
  public readonly name = 'ProjectManagerAgent';
  public readonly role = 'Requirement Analysis & Schema Normalization';

  private llmProvider: ILLMProvider;

  constructor(llmProvider: ILLMProvider) {
    this.llmProvider = llmProvider;
  }

  public async execute(state: PipelineState): Promise<Partial<PipelineState>> {
    const rawPrompt = state.requirements.raw_prompt?.trim();

    if (!rawPrompt) {
      throw new Error('ProjectManagerAgent: raw_prompt is empty.');
    }

    const promptText = PROJECT_MANAGER_PROMPT.replace('{raw_prompt}', rawPrompt);
    const timestamp = new Date().toISOString();

    try {
      const rawResult = await this.llmProvider.generateJSON<any>(
        promptText,
        'UserRequirements JSON Object'
      );

      // Robust unwrapping for LLMs that nest their output inside a root key
      const data = (rawResult?.UserRequirements || rawResult?.requirements || rawResult?.data || rawResult || {}) as any;

      // Extract category with smart fallbacks
      let extractedCategory = (data.category || data.project_name || data.domain || data.type || '').trim();
      if (!extractedCategory) {
        // Derive category from prompt keywords if LLM omitted it
        const lowerPrompt = rawPrompt.toLowerCase();
        if (/youtube|video|stream|tube/i.test(lowerPrompt)) extractedCategory = 'Video Streaming';
        else if (/restaurant|cafe|dining|food|bistro/i.test(lowerPrompt)) extractedCategory = 'Restaurant';
        else if (/health|clinic|doctor|hospital|medical/i.test(lowerPrompt)) extractedCategory = 'Healthcare';
        else if (/crypto|web3|blockchain|token|wallet/i.test(lowerPrompt)) extractedCategory = 'Crypto';
        else if (/portfolio|developer|designer|resume/i.test(lowerPrompt)) extractedCategory = 'Portfolio';
        else if (/ecommerce|shop|store|product|buy/i.test(lowerPrompt)) extractedCategory = 'E-Commerce';
        else if (/agency|studio|creative|marketing/i.test(lowerPrompt)) extractedCategory = 'Agency';
        else if (/fitness|gym|workout|trainer/i.test(lowerPrompt)) extractedCategory = 'Fitness';
        else extractedCategory = 'LandingPage';
      }

      // Extract key_features handling string arrays or object arrays [{feature: "..."}]
      let extractedFeatures: string[] = [];
      const rawFeaturesList = data.key_features || data.core_features || data.features || data.sections;
      if (Array.isArray(rawFeaturesList) && rawFeaturesList.length > 0) {
        extractedFeatures = rawFeaturesList.map((f: any) => {
          if (typeof f === 'string') return f.trim();
          if (f && typeof f === 'object') return (f.feature || f.name || f.title || f.description || '').trim();
          return '';
        }).filter(Boolean);
      }

      if (extractedFeatures.length === 0) {
        extractedFeatures = ['Hero Showcase', 'Key Capabilities', 'Interactive Demo', 'Community Reviews', 'Contact Section'];
      }

      const requirements: UserRequirements = {
        raw_prompt: rawPrompt,
        category: extractedCategory as UserRequirements['category'],
        target_audience: (data.target_audience || data.audience || 'Target users & community').trim(),
        key_features: extractedFeatures,
        preferred_theme: data.preferred_theme || 'dark',
        tone: (data.tone || data.brand_tone || 'bold').trim()
      };

      console.log('[ProjectManagerAgent] Raw LLM result:', JSON.stringify(rawResult));
      console.log('[ProjectManagerAgent] Final requirements:', JSON.stringify(requirements));

      return {
        requirements,
        project_metadata: {
          ...state.project_metadata,
          name: `${requirements.category} Site`,
          current_step: 'ProjectManagerAgent Completed',
          status: 'running'
        },
        logs: [
          ...state.logs,
          {
            timestamp,
            agentName: this.name,
            message: `Category="${requirements.category}" | Tone="${requirements.tone}" | Features: ${requirements.key_features.join(', ')}`,
            level: 'info'
          }
        ]
      };
    } catch (err: any) {
      const errorMsg = `ProjectManagerAgent failed: ${err.message || err}`;
      console.error('[ProjectManagerAgent]', errorMsg);
      return {
        errors: [...(state.errors || []), { agentName: this.name, error: errorMsg, timestamp }],
        logs: [...state.logs, { timestamp, agentName: this.name, message: errorMsg, level: 'error' }],
        project_metadata: { ...state.project_metadata, status: 'error', current_step: 'ProjectManagerAgent Error' }
      };
    }
  }
}
