import type { IAgent } from '../../core/interfaces/IAgent';
import type { PipelineState, ComponentDefinition, PipelineMetrics, ComponentDiagnostic } from '../../core/entities/PipelineState';
import type { ILLMProvider } from '../../core/interfaces/ILLMProvider';
import { TemplateRegistry } from '../../templates/TemplateRegistry';
import { INTEGRATOR_BUNDLE_PROMPT } from '../../prompts/integrator_bundle.prompt';
import { CodeRepairAgent } from './CodeRepairAgent';
import { BundleValidator } from '../validators/BundleValidator';
import { ResponseNormalizer } from './ResponseNormalizer';

import { compileBundle } from '../../ui/workspace/BundleCompiler';

export class IntegratorAgent implements IAgent {
  public readonly name = 'IntegratorAgent';
  public readonly role = 'Generation Orchestrator & Self-Healing Engine';

  private initialLlmProvider?: ILLMProvider;

  private bundleValidator = new BundleValidator();

  constructor(llmProvider?: ILLMProvider) {
    this.initialLlmProvider = llmProvider;
  }

  public async execute(state: PipelineState): Promise<Partial<PipelineState>> {
    const startTime = Date.now();
    const category = state.requirements.category || 'LandingPage';
    const timestamp = new Date().toISOString();
    const budget = state.generation_budget;
    
    const generatedFiles: Record<string, string> = { ...state.generated_files };
    const componentDiagnostics: ComponentDiagnostic[] = state.component_diagnostics ? [...state.component_diagnostics] : [];
    const newErrors: any[] = [];
    let usedTemplateFallback = false;
    let fallbackReason = '';

    const metrics: PipelineMetrics = state.metrics || {
      generationTimeMs: 0, repairCount: 0, retryCount: 0, componentCount: 0,
      cacheHits: 0, cacheMisses: 0, validationErrors: 0, repairDurationMs: 0
    };

    if (!this.initialLlmProvider || !state.component_plan || !state.component_plan.components.length) {
      usedTemplateFallback = true;
      fallbackReason = !this.initialLlmProvider ? 'No LLM provider configured' : 'Missing component plan';
    } else if (budget && !budget.canCall()) {
      usedTemplateFallback = true;
      fallbackReason = 'Generation budget exhausted';
    } else {
      const componentsToGenerate = state.component_plan.components;
      metrics.componentCount = componentsToGenerate.length;
      console.log(`[IntegratorAgent] 🚀 Single-call generation of ${componentsToGenerate.length} components...`);

      // Build the component plan summary for the prompt
      const componentPlanText = componentsToGenerate
        .map(c => `- ${c.name}: ${c.purpose}${c.props?.length ? ' (props: ' + c.props.join(', ') + ')' : ''}`)
        .join('\n');

      const dataModelJson = JSON.stringify(state.data_model || {}, null, 2);

      const promptText = INTEGRATOR_BUNDLE_PROMPT
        .replace('{raw_prompt}', state.requirements.raw_prompt || category || 'Custom Web Application')
        .replace('{category}', category)
        .replace('{tone}', state.requirements.tone || 'bold')
        .replace('{target_audience}', state.requirements.target_audience || 'General Users')
        .replace('{component_plan}', componentPlanText)
        .replace('{data_model}', dataModelJson)
        .replace('{data_model_json}', dataModelJson)
        .replace('{ui_spec}', JSON.stringify(state.ui_spec || {}, null, 2))
        .replace('{content}', JSON.stringify(state.content || {}, null, 2));



      try {
        // === SINGLE LLM CALL FOR ALL COMPONENTS ===
        if (budget) budget.recordCall();
        const genStartTime = Date.now();

        const rawResult = await this.initialLlmProvider!.generateJSON<any>(
          promptText,
          'JSON object with "files" key containing all component code files'
        );

        const genDuration = Date.now() - genStartTime;
        console.log(`[IntegratorAgent] ✅ Single-call generation completed in ${genDuration}ms`);

        // Extract files from response (handle various LLM response shapes)
        const filesObj = this.extractFiles(rawResult, componentsToGenerate);

        if (Object.keys(filesObj).length === 0) {
          throw new Error('LLM returned no parseable component files');
        }

        // Populate generated files
        for (const [fileName, code] of Object.entries(filesObj)) {
          const cleanCode = ResponseNormalizer.cleanCode(code);
          if (cleanCode && (cleanCode.includes('function') || cleanCode.includes('const') || cleanCode.includes('=>'))) {
            generatedFiles[fileName] = cleanCode;
            metrics.cacheMisses = (metrics.cacheMisses || 0) + 1;

            componentDiagnostics.push({
              component: fileName,
              provider: 'Primary',
              model: 'Default',
              rawResponseType: 'bundle',
              normalized: true,
              validation: 'pass',
              repairCount: 0,
              finalSize: cleanCode.length,
              status: 'success',
              generationTimeMs: genDuration
            });
          }
        }


      } catch (err: any) {
        console.error(`[IntegratorAgent] ❌ Single-call generation failed: ${err.message}`);
        newErrors.push({ agentName: this.name, error: `Bundle generation failed: ${err.message}`, timestamp });
      }

      // Ensure App.tsx exists
      if (!generatedFiles['App.tsx']) {
        generatedFiles['App.tsx'] = this.generateAppFromModel(componentsToGenerate, state.data_model || {});
      }

      // Ensure all planned components have files (generate placeholders for missing ones)
      for (const comp of componentsToGenerate) {
        const fileName = `${comp.name}.tsx`;
        if (comp.name !== 'App' && !generatedFiles[fileName]) {
          console.warn(`[IntegratorAgent] ⚠️ Missing component ${fileName}, using placeholder`);
          generatedFiles[fileName] = this.generatePlaceholder(comp.name);
        }
      }

      const requiredNames = componentsToGenerate.map(c => c.name);

      // === LOCAL VALIDATION (no LLM calls) ===
      let bundleCheck = this.bundleValidator.validateBundle(generatedFiles, requiredNames);
      if (!bundleCheck.valid) {
        console.warn(`[IntegratorAgent] ⚠️ Bundle validation found issues: ${bundleCheck.errors.join(', ')}`);
        // Try deterministic App.tsx fix first (no LLM)
        generatedFiles['App.tsx'] = this.generateAppFromModel(componentsToGenerate, state.data_model || {});
        bundleCheck = this.bundleValidator.validateBundle(generatedFiles, requiredNames);
      }

      // === SINGLE REPAIR ATTEMPT (if budget allows) ===
      let bundleResult = compileBundle(generatedFiles);

      if (!bundleResult.success && budget?.canRepair()) {
        console.log(`[IntegratorAgent] 🛠 Bundle compilation failed. Attempting ONE batch repair...`);
        budget.recordRepair();
        metrics.repairCount = (metrics.repairCount || 0) + 1;
        const repairStartTime = Date.now();

        const fatalDiagnostics = bundleResult.diagnostics.filter(d => d.type !== 'BUNDLE_VALID');

        // Fix simple issues locally first (markdown fences, missing deps)
        for (const diag of fatalDiagnostics) {
          if (diag.type === 'MARKDOWN_FENCE' && diag.source && generatedFiles[diag.source]) {
            generatedFiles[diag.source] = ResponseNormalizer.cleanCode(generatedFiles[diag.source]);
          }
          if (diag.type === 'MISSING_DEPENDENCY' && diag.dependency && diag.source && generatedFiles[diag.source]) {
            const dep = diag.dependency;
            let src = generatedFiles[diag.source];
            // Strip invalid import
            src = src.replace(new RegExp(`import\\s+.*?from\\s+['"].*?${dep}['"]\\s*;?`, 'g'), '');
            // Inline-replace custom component tags with div fallbacks
            src = src.replace(new RegExp(`<${dep}\\b([^>]*)>(.*?)</${dep}>`, 'gs'), '<div className="p-4 rounded-xl bg-slate-800/50" $1>$2</div>');
            src = src.replace(new RegExp(`<${dep}\\b([^>]*)/\\s*>`, 'g'), `<div className="p-4 rounded-xl bg-slate-800/50">${dep}</div>`);
            generatedFiles[diag.source] = ResponseNormalizer.cleanCode(src);
          }
        }

        // Re-check after local fixes
        bundleResult = compileBundle(generatedFiles);

        if (!bundleResult.success) {
          // Collect remaining errors for a single batch repair LLM call
          const remainingErrors = bundleResult.diagnostics
            .filter(d => d.type !== 'BUNDLE_VALID' && d.source && generatedFiles[d.source])
            .slice(0, 3); // Limit to 3 most critical errors

          if (remainingErrors.length > 0) {
            try {
              const repairAgent = new CodeRepairAgent(this.initialLlmProvider!);
              for (const diag of remainingErrors) {
                if (diag.source && generatedFiles[diag.source]) {
                  const repaired = await repairAgent.repair(
                    diag.source.replace('.tsx', ''),
                    generatedFiles[diag.source],
                    [diag.message]
                  );
                  if (repaired) generatedFiles[diag.source] = ResponseNormalizer.cleanCode(repaired);
                }
              }
            } catch (e) {
              console.error('[IntegratorAgent] Batch repair failed:', e);
            }
          }

          // Final recompile
          this.bundleValidator.validateBundle(generatedFiles, requiredNames);
          bundleResult = compileBundle(generatedFiles);
        }

        metrics.repairDurationMs = (metrics.repairDurationMs || 0) + (Date.now() - repairStartTime);
      }

      console.log(`\n====================================================`);
      console.log(`[IntegratorAgent] 📊 FINAL BUNDLE RESULT:`);
      console.log(`Generated Files: [${Object.keys(generatedFiles).join(', ')}]`);
      console.log(`Compilation: ${bundleResult.success ? 'PASS ✅' : 'FAIL ❌'}`);
      console.log(`Execution Order: [${bundleResult.executionOrder.join(', ')}]`);
      console.log(`====================================================\n`);
    }

    if (usedTemplateFallback) {
      const blueprint = TemplateRegistry.getTemplate(category);
      const appTsx = blueprint.renderCode({
        requirements: state.requirements,
        ui_spec: state.ui_spec,
        content: state.content,
        seo: state.seo
      });
      for (const k of Object.keys(generatedFiles)) {
        delete generatedFiles[k];
      }
      generatedFiles['App.tsx'] = appTsx;
      generatedFiles['index.css'] = '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n';
      console.log(`[IntegratorAgent] ⚠️ Using template fallback for ${category} due to: ${fallbackReason}`);
    }

    metrics.generationTimeMs = Date.now() - startTime;
    if (budget) budget.recordStep('IntegratorAgent', metrics.generationTimeMs);

    const logMessage = usedTemplateFallback
      ? `Template fallback used for "${category}". Reason: ${fallbackReason}`
      : `AI generated ${Object.keys(generatedFiles).length} components in ${metrics.generationTimeMs}ms (single-call).`;

    return {
      generated_files: generatedFiles,
      component_diagnostics: componentDiagnostics,
      metrics,
      errors: [...(state.errors || []), ...newErrors],
      project_metadata: {
        ...state.project_metadata,
        current_step: 'IntegratorAgent Completed',
        status: 'completed'
      },
      logs: [
        ...(state.logs || []),
        { timestamp, agentName: this.name, message: logMessage, level: usedTemplateFallback ? 'warn' : 'info' }
      ]
    };
  }

  /**
   * Extract files from various LLM response shapes.
   */
  private extractFiles(raw: any, components: ComponentDefinition[]): Record<string, string> {
    const files: Record<string, string> = {};
    if (!raw) return files;

    // Shape 1: { files: { "Navbar.tsx": "..." } }
    const filesObj = raw.files || raw.components || raw;
    if (typeof filesObj === 'object' && !Array.isArray(filesObj)) {
      for (const [key, value] of Object.entries(filesObj)) {
        if (typeof value === 'string' && value.trim().length > 10) {
          // Normalize key to ensure .tsx extension
          const fileName = key.endsWith('.tsx') ? key : `${key}.tsx`;
          files[fileName] = value;
        }
      }
    }

    // Shape 2: raw string containing multiple component definitions (unlikely but handle)
    if (typeof raw === 'string' && Object.keys(files).length === 0) {
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(raw);
        return this.extractFiles(parsed, components);
      } catch {
        // Can't parse, skip
      }
    }

    return files;
  }

  private generatePlaceholder(componentName: string): string {
    return `import React from 'react';\n\nexport default function ${componentName}({ data = {} }) {\n  const { title = '${componentName}', subtitle = '' } = (data || {});\n  return (\n    <section className="py-20 px-6">\n      <div className="max-w-7xl mx-auto text-center">\n        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>\n        {subtitle && <p className="text-slate-400 text-lg">{subtitle}</p>}\n      </div>\n    </section>\n  );\n}\n`;
  }

  private generateAppFromModel(components: ComponentDefinition[], dataModel: Record<string, any>): string {
    const validComponents = components.filter(c => c.name !== 'App');
    const dataModelJson = JSON.stringify(dataModel || {}, null, 2);
    
    const componentTags = validComponents.map(c => {
      const dataKey = c.name.charAt(0).toLowerCase() + c.name.slice(1);
      return `      <${c.name} data={pageData?.['${dataKey}'] ?? pageData?.['${c.name}'] ?? {}} />`;
    }).join('\n');

    return `import React from 'react';

const pageData = ${dataModelJson};

export default function App() {
  const ds = pageData?.designSystem || {};
  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-violet-500 selection:text-white"
      style={{
        '--primary': ds.primaryColor || '#7c3aed',
        '--secondary': ds.secondaryColor || '#6366f1',
        '--accent': ds.accentColor || '#ec4899',
      } as React.CSSProperties}
    >
${componentTags}
    </div>
  );
}
`;
  }
}
