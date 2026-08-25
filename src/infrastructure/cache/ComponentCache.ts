import type { ComponentDefinition, PipelineState } from '../../core/entities/PipelineState';

export class ComponentCache {
  private static cache: Map<string, string> = new Map();

  public static generateKey(state: PipelineState, compDef: ComponentDefinition): string {
    const dataToHash = {
      rawPrompt: (state.requirements.raw_prompt || '').trim().toLowerCase().slice(0, 100),
      category: state.requirements.category,
      tone: state.requirements.tone,
      features: state.requirements.key_features,
      uiMode: state.ui_spec.theme.mode,
      primaryColor: state.ui_spec.theme.primaryColor,
      compName: compDef.name,
      compProps: compDef.props
    };
    
    // A simple deterministic string hash (suitable for in-memory caching during prototyping)
    const str = JSON.stringify(dataToHash);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `${compDef.name}_${Math.abs(hash)}`;
  }

  public static get(key: string): string | undefined {
    return this.cache.get(key);
  }

  public static set(key: string, code: string): void {
    this.cache.set(key, code);
  }

  public static clear(): void {
    this.cache.clear();
  }
}
