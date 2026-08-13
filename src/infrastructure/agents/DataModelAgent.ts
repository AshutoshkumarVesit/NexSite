import type { IAgent } from '../../core/interfaces/IAgent';
import type { PipelineState } from '../../core/entities/PipelineState';
import type { ILLMProvider } from '../../core/interfaces/ILLMProvider';
import { DATA_MODEL_AGENT_PROMPT } from '../../prompts/data_model.prompt';

export class DataModelAgent implements IAgent {
  public name = 'DataModelAgent';
  public role = 'Data Architect';

  constructor(private llmProvider: ILLMProvider) {}

  public async execute(state: PipelineState): Promise<Partial<PipelineState>> {
    const timestamp = new Date().toISOString();
    console.log('[DataModelAgent] Generating unified data model...');

    try {
      const prompt = DATA_MODEL_AGENT_PROMPT
        .replace('{requirements}', JSON.stringify(state.requirements, null, 2))
        .replace('{ui_spec}', JSON.stringify(state.ui_spec, null, 2))
        .replace('{content}', JSON.stringify(state.content, null, 2))
        .replace('{component_plan}', JSON.stringify(state.component_plan, null, 2));

      const rawResult = await this.llmProvider.generateJSON<any>(
        prompt,
        'A unified JSON object containing all the application data.'
      );

      return {
        data_model: rawResult,
        project_metadata: {
          ...state.project_metadata,
          current_step: 'DataModelAgent Completed',
          status: 'running'
        },
        logs: [
          {
            timestamp,
            agentName: this.name,
            message: 'Successfully generated unified Data Model.',
            level: 'info'
          }
        ]
      };
    } catch (err: any) {
      console.error('[DataModelAgent] Error:', err);
      return {
        errors: [{
          agentName: this.name,
          error: `Failed to generate data model: ${err.message}`,
          timestamp
        }]
      };
    }
  }
}
