/**
 * Centralized LLM request budget for a single generation pipeline run.
 * Prevents runaway API consumption from retry/repair loops.
 */
export interface GenerationBudgetState {
  maxLlmCalls: number;
  usedLlmCalls: number;
  maxRepairCalls: number;
  repairCalls: number;
  timeline: { agent: string; durationMs: number }[];
}

export class GenerationBudget {
  private state: GenerationBudgetState;

  constructor(maxLlmCalls = 10, maxRepairCalls = 1) {
    this.state = {
      maxLlmCalls,
      usedLlmCalls: 0,
      maxRepairCalls,
      repairCalls: 0,
      timeline: []
    };
  }

  /** Returns true if another LLM call is permitted. */
  public canCall(): boolean {
    return this.state.usedLlmCalls < this.state.maxLlmCalls;
  }

  /** Returns true if a repair LLM call is permitted. */
  public canRepair(): boolean {
    return this.state.repairCalls < this.state.maxRepairCalls && this.canCall();
  }

  /** Record an LLM call. Returns false if budget was already exhausted. */
  public recordCall(): boolean {
    if (!this.canCall()) {
      console.warn(`[GenerationBudget] ⛔ LLM call BLOCKED — budget exhausted (${this.state.usedLlmCalls}/${this.state.maxLlmCalls})`);
      return false;
    }
    this.state.usedLlmCalls++;
    console.log(`[GenerationBudget] LLM call ${this.state.usedLlmCalls}/${this.state.maxLlmCalls}`);
    return true;
  }

  /** Record a repair LLM call. Returns false if repair budget was exhausted. */
  public recordRepair(): boolean {
    if (!this.canRepair()) {
      console.warn(`[GenerationBudget] ⛔ Repair call BLOCKED — repair budget exhausted (${this.state.repairCalls}/${this.state.maxRepairCalls})`);
      return false;
    }
    this.state.repairCalls++;
    this.state.usedLlmCalls++;
    console.log(`[GenerationBudget] Repair call ${this.state.repairCalls}/${this.state.maxRepairCalls} (total LLM: ${this.state.usedLlmCalls}/${this.state.maxLlmCalls})`);
    return true;
  }

  /** Record an agent step in the timeline. */
  public recordStep(agent: string, durationMs: number): void {
    this.state.timeline.push({ agent, durationMs });
  }

  /** Get current state snapshot. */
  public getState(): GenerationBudgetState {
    return { ...this.state, timeline: [...this.state.timeline] };
  }

  /** Print a compact summary. */
  public printSummary(): void {
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║       GENERATION BUDGET SUMMARY          ║`);
    console.log(`╠══════════════════════════════════════════╣`);
    console.log(`║ LLM calls:    ${String(this.state.usedLlmCalls).padStart(2)}/${String(this.state.maxLlmCalls).padStart(2)}                     ║`);
    console.log(`║ Repair calls: ${String(this.state.repairCalls).padStart(2)}/${String(this.state.maxRepairCalls).padStart(2)}                     ║`);
    console.log(`╠══════════════════════════════════════════╣`);
    for (const step of this.state.timeline) {
      const name = step.agent.padEnd(22);
      const time = step.durationMs < 1000
        ? `${step.durationMs}ms`
        : `${(step.durationMs / 1000).toFixed(1)}s`;
      console.log(`║ ${name} ${time.padStart(8)}       ║`);
    }
    console.log(`╚══════════════════════════════════════════╝\n`);
  }
}
