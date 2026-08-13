import type { IAgent } from '../../../core/interfaces/IAgent';
import type { PipelineState } from '../../../core/entities/PipelineState';

export class BackendAgent implements IAgent {
  public readonly name = 'BackendAgent (Placeholder)';
  public readonly role = 'Serverless API & Database Schema Generator (Future)';

  public async execute(state: PipelineState): Promise<Partial<PipelineState>> {
    return {
      logs: [
        ...state.logs,
        {
          timestamp: new Date().toISOString(),
          agentName: this.name,
          message: '[Placeholder] Backend API routes queued for future execution pass.',
          level: 'info'
        }
      ]
    };
  }
}
