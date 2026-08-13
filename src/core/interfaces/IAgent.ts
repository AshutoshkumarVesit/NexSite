import type { PipelineState } from '../entities/PipelineState';

export interface IAgent {
  readonly name: string;
  readonly role: string;
  execute(state: PipelineState): Promise<Partial<PipelineState>>;
}
