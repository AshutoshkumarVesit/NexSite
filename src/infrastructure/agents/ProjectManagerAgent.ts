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
      const llmResult = await this.llmProvider.generateJSON<Partial<UserRequirements>>(
        promptText,
        'UserRequirements JSON Object'
      );

      // Trust the LLM completely — only fill in missing fields, never override
      const requirements: UserRequirements = {
        raw_prompt: rawPrompt,
        category: (llmResult.category?.trim() || 'LandingPage') as UserRequirements['category'],
        target_audience: llmResult.target_audience?.trim() || 'General online audience',
        key_features: Array.isArray(llmResult.key_features) && llmResult.key_features.length > 0
          ? llmResult.key_features.map(f => String(f).trim()).filter(Boolean)
          : ['Responsive Layout', 'Modern Design', 'Fast Performance'],
        preferred_theme: llmResult.preferred_theme || 'dark',
        tone: llmResult.tone || 'bold'
      };

      console.log('[ProjectManagerAgent] Raw LLM result:', JSON.stringify(llmResult));
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
