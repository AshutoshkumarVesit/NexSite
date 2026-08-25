import type { PipelineState } from '../../core/entities/PipelineState';
import type { IAgent } from '../../core/interfaces/IAgent';
import { ProjectManagerAgent } from '../../infrastructure/agents/ProjectManagerAgent';
import { UIAgent } from '../../infrastructure/agents/UIAgent';
import { ContentAgent } from '../../infrastructure/agents/ContentAgent';
import { SEOAgent } from '../../infrastructure/agents/SEOAgent';
import { ComponentPlannerAgent } from '../../infrastructure/agents/ComponentPlannerAgent';
import { DataModelAgent } from '../../infrastructure/agents/DataModelAgent';
import { IntegratorAgent } from '../../infrastructure/agents/IntegratorAgent';
import { GenerationBudget } from '../../infrastructure/llm/GenerationBudget';
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
    // Initialize generation budget (max 10 LLM calls, max 1 repair)
    const budget = new GenerationBudget(10, 1);

    let currentState: PipelineState = { 
      ...initialState,
      generation_budget: budget,
      project_metadata: {
        ...initialState.project_metadata,
        progress_percent: 5,
        current_step: 'Initializing pipeline...',
        status: 'running'
      }
    };
    if (onStateUpdate) {
      onStateUpdate({ ...currentState });
    }

    const executeNode = async (agent: IAgent, stepLabel: string, progress: number): Promise<void> => {
      const stepStart = Date.now();
      currentState = {
        ...currentState,
        project_metadata: {
          ...currentState.project_metadata,
          current_step: stepLabel,
          progress_percent: progress,
          status: 'running'
        }
      };
      if (onStateUpdate) {
        onStateUpdate({ ...currentState });
      }

      try {
        const partialUpdate = await agent.execute(currentState);
        currentState = {
          ...currentState,
          ...partialUpdate,
          generation_budget: budget, // preserve budget reference
          logs: partialUpdate.logs || currentState.logs,
          errors: partialUpdate.errors || currentState.errors,
          project_metadata: {
            ...currentState.project_metadata,
            ...(partialUpdate.project_metadata || {}),
            progress_percent: progress,
            status: 'running'
          }
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
      budget.recordStep(agent.name, Date.now() - stepStart);
    };

    const totalPipelineStartTime = Date.now();
    const HARD_TIMEOUT_MS = 120_000;

    const pipelinePromise = (async (): Promise<PipelineState> => {
      // Node 1: ProjectManagerAgent (15%)
      await executeNode(this.pmAgent, 'Analyzing requirements & architecture', 15);

      if (options?.runOnlyProjectManager) {
        currentState.project_metadata.status = 'completed';
        currentState.project_metadata.progress_percent = 100;
        currentState.project_metadata.current_step = 'ProjectManagerAgent Completed (Milestone 1)';
        if (onStateUpdate) {
          onStateUpdate({ ...currentState });
        }
        return currentState;
      }

      // Node 2: UIAgent (30%)
      await executeNode(this.uiAgent, 'Designing UI specifications & color theme', 30);

      if (options?.runUpToUIAgent) {
        currentState.project_metadata.status = 'completed';
        currentState.project_metadata.progress_percent = 100;
        currentState.project_metadata.current_step = 'UIAgent Completed (Milestone 2)';
        if (onStateUpdate) {
          onStateUpdate({ ...currentState });
        }
        return currentState;
      }

      // Nodes 3+4: ContentAgent + SEOAgent (PARALLEL — they don't depend on each other)
      currentState = {
        ...currentState,
        project_metadata: {
          ...currentState.project_metadata,
          current_step: 'Crafting content & SEO (parallel)',
          progress_percent: 45,
          status: 'running'
        }
      };
      if (onStateUpdate) onStateUpdate({ ...currentState });

      const parallelStart = Date.now();
      const [contentResult, seoResult] = await Promise.allSettled([
        this.contentAgent.execute(currentState),
        this.seoAgent.execute(currentState)
      ]);

      // Merge content result
      if (contentResult.status === 'fulfilled') {
        currentState = { ...currentState, ...contentResult.value, generation_budget: budget, logs: contentResult.value.logs || currentState.logs, errors: contentResult.value.errors || currentState.errors };
      } else {
        currentState.logs.push({ timestamp: new Date().toISOString(), agentName: 'ContentAgent', message: `Failed: ${contentResult.reason}`, level: 'error' });
      }
      budget.recordStep('ContentAgent', Date.now() - parallelStart);

      // Merge SEO result
      if (seoResult.status === 'fulfilled') {
        currentState = { ...currentState, ...seoResult.value, generation_budget: budget, logs: seoResult.value.logs || currentState.logs, errors: seoResult.value.errors || currentState.errors };
      } else {
        currentState.logs.push({ timestamp: new Date().toISOString(), agentName: 'SEOAgent', message: `Failed: ${seoResult.reason}`, level: 'error' });
      }
      budget.recordStep('SEOAgent', Date.now() - parallelStart);

      currentState.project_metadata.progress_percent = 55;
      if (onStateUpdate) onStateUpdate({ ...currentState });

      // Node 5: ComponentPlannerAgent (70%)
      await executeNode(this.componentPlannerAgent, 'Structuring React component hierarchy', 70);

      // Node 6: DataModelAgent (80%)
      await executeNode(this.dataModelAgent, 'Modeling dynamic schema & interactive state', 80);

      // Node 7: IntegratorAgent (90% -> 100%) — SINGLE LLM call for all components
      await executeNode(this.integratorAgent, 'Generating complete website bundle', 95);

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
        totalDurationMs
      };

      currentState.project_metadata = {
        ...currentState.project_metadata,
        progress_percent: 100,
        current_step: 'Generation Complete',
        status: 'completed'
      };
      if (onStateUpdate) {
        onStateUpdate({ ...currentState });
      }

      // Print budget summary
      budget.printSummary();

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
