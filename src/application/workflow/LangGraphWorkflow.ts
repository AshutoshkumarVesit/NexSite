import type { PipelineState } from '../../core/entities/PipelineState';
import type { IAgent } from '../../core/interfaces/IAgent';
import { ProjectManagerAgent } from '../../infrastructure/agents/ProjectManagerAgent';
import { UIAgent } from '../../infrastructure/agents/UIAgent';
import { ContentAgent } from '../../infrastructure/agents/ContentAgent';
import { SEOAgent } from '../../infrastructure/agents/SEOAgent';
import { ComponentPlannerAgent } from '../../infrastructure/agents/ComponentPlannerAgent';
import { DataModelAgent } from '../../infrastructure/agents/DataModelAgent';
import { IntegratorAgent } from '../../infrastructure/agents/IntegratorAgent';
import type { ILLMProvider } from '../../core/interfaces/ILLMProvider';

export type StateUpdateCallback = (state: PipelineState) => void;

export interface WorkflowOptions {
  runOnlyProjectManager?: boolean;
  runUpToUIAgent?: boolean;
  runMVPIntegrator?: boolean;
}

export class LangGraphWorkflow {
  private pmAgent: ProjectManagerAgent;
  private uiAgent: UIAgent;
  private contentAgent: ContentAgent;
  private seoAgent: SEOAgent;
  private componentPlannerAgent: ComponentPlannerAgent;
  private dataModelAgent: DataModelAgent;
  private integratorAgent: IntegratorAgent;

  constructor(llmProvider: ILLMProvider) {
    this.pmAgent = new ProjectManagerAgent(llmProvider);
    this.uiAgent = new UIAgent(llmProvider);
    this.contentAgent = new ContentAgent(llmProvider);
    this.seoAgent = new SEOAgent(llmProvider);
    this.componentPlannerAgent = new ComponentPlannerAgent(llmProvider);
    this.dataModelAgent = new DataModelAgent(llmProvider);
    this.integratorAgent = new IntegratorAgent(llmProvider);
  }

  /**
   * Executes the LangGraph StateGraph pipeline.
   */
  public async run(
    initialState: PipelineState,
    onStateUpdate?: StateUpdateCallback,
    options?: WorkflowOptions
  ): Promise<PipelineState> {
    let currentState: PipelineState = { ...initialState };

    const executeNode = async (agent: IAgent): Promise<void> => {
      try {
        const partialUpdate = await agent.execute(currentState);
        currentState = {
          ...currentState,
          ...partialUpdate,
          logs: partialUpdate.logs || currentState.logs,
          errors: partialUpdate.errors || currentState.errors
        };
        if (onStateUpdate) {
          onStateUpdate({ ...currentState });
        }
      } catch (err: any) {
        const errorMsg = err.message || 'Unknown node execution error';
        currentState.errors.push({
          agentName: agent.name,
          error: errorMsg,
          timestamp: new Date().toISOString()
        });
        currentState.logs.push({
          timestamp: new Date().toISOString(),
          agentName: agent.name,
          message: `Execution failed: ${errorMsg}`,
          level: 'error'
        });
        currentState.project_metadata = {
          ...currentState.project_metadata,
          status: 'error'
        };
        if (onStateUpdate) {
          onStateUpdate({ ...currentState });
        }
        throw err;
      }
    };

    const totalPipelineStartTime = Date.now();
    const HARD_TIMEOUT_MS = 120_000;

    const pipelinePromise = (async (): Promise<PipelineState> => {
      // Node 1: ProjectManagerAgent
      await executeNode(this.pmAgent);

      if (options?.runOnlyProjectManager) {
        currentState.project_metadata.status = 'completed';
        currentState.project_metadata.current_step = 'ProjectManagerAgent Completed (Milestone 1)';
        if (onStateUpdate) {
          onStateUpdate({ ...currentState });
        }
        return currentState;
      }

      // Node 2: UIAgent
      await executeNode(this.uiAgent);

      if (options?.runUpToUIAgent) {
        currentState.project_metadata.status = 'completed';
        currentState.project_metadata.current_step = 'UIAgent Completed (Milestone 2)';
        if (onStateUpdate) {
          onStateUpdate({ ...currentState });
        }
        return currentState;
      }

      // Node 3: ContentAgent
      await executeNode(this.contentAgent);

      // Node 4: SEOAgent
      await executeNode(this.seoAgent);

      // Node 5: ComponentPlannerAgent
      const plannerStart = Date.now();
      await executeNode(this.componentPlannerAgent);
      const plannerDurationMs = Date.now() - plannerStart;

      // Node 6: DataModelAgent
      const dataModelStart = Date.now();
      await executeNode(this.dataModelAgent);
      const dataModelDurationMs = Date.now() - dataModelStart;

      // Node 7: IntegratorAgent
      await executeNode(this.integratorAgent);

      const totalDurationMs = Date.now() - totalPipelineStartTime;
      currentState.metrics = {
        ...(currentState.metrics || {
          generationTimeMs: 0,
          repairCount: 0,
          retryCount: 0,
          componentCount: 0,
          cacheHits: 0,
          cacheMisses: 0,
          validationErrors: 0,
          repairDurationMs: 0
        }),
        plannerDurationMs,
        dataModelDurationMs,
        totalDurationMs
      };

      return currentState;
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Pipeline Hard Timeout: Total execution exceeded ${HARD_TIMEOUT_MS / 1000}s limit.`));
      }, HARD_TIMEOUT_MS);
    });

    return Promise.race([pipelinePromise, timeoutPromise]);
  }
}
