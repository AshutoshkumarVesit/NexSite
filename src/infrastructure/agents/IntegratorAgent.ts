import type { IAgent } from '../../core/interfaces/IAgent';
import type { PipelineState, ComponentDefinition, PipelineMetrics, ComponentDiagnostic } from '../../core/entities/PipelineState';
import type { ILLMProvider } from '../../core/interfaces/ILLMProvider';
import { TemplateRegistry } from '../../templates/TemplateRegistry';
import { INTEGRATOR_AGENT_PROMPT } from '../../prompts/integrator.prompt';
import { ComponentValidatorAgent } from './ComponentValidatorAgent';
import { CodeRepairAgent } from './CodeRepairAgent';
import { BundleValidator } from '../validators/BundleValidator';
import { ComponentCache } from '../cache/ComponentCache';
import { ResponseNormalizer } from './ResponseNormalizer';


import { compileBundle } from '../../ui/workspace/BundleCompiler';

export class IntegratorAgent implements IAgent {
  public readonly name = 'IntegratorAgent';
  public readonly role = 'Generation Orchestrator & Self-Healing Engine';

  private initialLlmProvider?: ILLMProvider;
  private validator = new ComponentValidatorAgent();
  private bundleValidator = new BundleValidator();

  constructor(llmProvider?: ILLMProvider) {
    this.initialLlmProvider = llmProvider;
  }

  public async execute(state: PipelineState): Promise<Partial<PipelineState>> {
    const startTime = Date.now();
    const category = state.requirements.category || 'LandingPage';
    const timestamp = new Date().toISOString();
    
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
    } else {
      const componentsToGenerate = state.component_plan.components;
      metrics.componentCount = componentsToGenerate.length;
      console.log(`[IntegratorAgent] Starting orchestrated generation of ${componentsToGenerate.length} components...`);

      const parallelStartTime = Date.now();
      const compResults = await Promise.all(
        componentsToGenerate.map(async (compDef) => {
          const compStartTime = Date.now();
          const fileName = `${compDef.name}.tsx`;
          const cacheKey = ComponentCache.generateKey(state, compDef);
          
          const cachedCode = ComponentCache.get(cacheKey);
          if (cachedCode) {
            console.log(`[IntegratorAgent] ⚡ Cache HIT for ${fileName}`);
            return {
              fileName,
              code: cachedCode,
              cacheHit: true,
              diagnostic: {
                component: fileName,
                provider: 'Cache',
                model: 'Cached',
                rawResponseType: 'cache',
                normalized: true,
                validation: 'pass' as const,
                repairCount: 0,
                finalSize: cachedCode.length,
                status: 'success' as const,
                generationTimeMs: 0
              }
            };
          }
          
          console.log(`[IntegratorAgent] Generating ${fileName} (Parallel)...`);
          
          let code = '';
          let isSuccess = false;
          let repairAttempts = 0;
          let compError: any = null;
          let diagnostic: ComponentDiagnostic = {
            component: fileName,
            provider: 'Primary',
            model: 'Default',
            rawResponseType: 'unknown',
            normalized: false,
            validation: 'fail',
            repairCount: 0,
            finalSize: 0,
            status: 'fallback',
            generationTimeMs: 0
          };

          try {
            const promptText = INTEGRATOR_AGENT_PROMPT
              .replace('{raw_prompt}', state.requirements.raw_prompt || category || 'Custom Web Application')
              .replace('{component_name}', compDef.name)
              .replace('{component_purpose}', compDef.purpose)
              .replace('{component_props}', (compDef.props || []).join(', '))
              .replace('{category}', category)
              .replace('{tone}', state.requirements.tone || 'bold')
              .replace('{target_audience}', state.requirements.target_audience || 'General Users')
              .replace('{key_features}', (state.requirements.key_features || []).join(', '))
              .replace('{ui_spec}', JSON.stringify(state.ui_spec || {}, null, 2))
              .replace('{data_model}', JSON.stringify(state.data_model || {}, null, 2))
              .replace('{data_model_json}', JSON.stringify(state.data_model || {}, null, 2));

            const rawResult = await this.initialLlmProvider!.generateJSON<any>(
              promptText,
              `JSON object with key "${fileName}" containing self-contained React component code`
            );

            console.log(`\n========== COMPONENT ==========\n${fileName}\nRAW RESPONSE\n${typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult, null, 2)}\n==============================\n`);

            const normalized = ResponseNormalizer.normalize(rawResult, fileName);
            code = normalized.code;
            diagnostic.rawResponseType = normalized.type;
            diagnostic.normalized = !!code;

            let validation = this.validator.validate(code, fileName, rawResult);
            const maxRepairs = 3;
            
            if (!validation.valid) {
              metrics.validationErrors++;
              const repairAgent = new CodeRepairAgent(this.initialLlmProvider!);
              const repairStartTime = Date.now();
              
              while (!validation.valid && repairAttempts < maxRepairs) {
                console.warn(`[IntegratorAgent] ⚠️ Validation failed for ${fileName}. Attempting repair ${repairAttempts + 1}/${maxRepairs}...`, validation.errors);
                metrics.repairCount++;
                
                code = await repairAgent.repair(compDef.name, code, validation.errors);
                validation = this.validator.validate(code, fileName, 'REPAIR_CYCLE');
                repairAttempts++;
              }
              metrics.repairDurationMs += (Date.now() - repairStartTime);
            }

            diagnostic.repairCount = repairAttempts;
            diagnostic.validation = validation.valid ? 'pass' : 'fail';
            diagnostic.finalSize = code.length;

            if (validation.valid) {
               isSuccess = true;
               diagnostic.status = 'success';
               ComponentCache.set(cacheKey, code);
            } else {
               throw new Error(`Failed to validate after ${maxRepairs} repair attempts. Errors: ${validation.errors.join(', ')}`);
            }
          } catch (err: any) {
            console.error(`[IntegratorAgent] ❌ Fatal error generating ${fileName}: ${err.message}`);
            compError = { agentName: this.name, error: `Failed to generate ${fileName}: ${err.message}`, timestamp };
          }

          diagnostic.generationTimeMs = Date.now() - compStartTime;

          return {
            fileName,
            code: isSuccess ? code : this.generatePlaceholder(compDef.name),
            cacheHit: false,
            diagnostic,
            error: compError
          };
        })
      );

      let totalCompTime = 0;
      let maxCompTime = 0;

      for (const res of compResults) {
        generatedFiles[res.fileName] = res.code;
        if (res.cacheHit) {
          metrics.cacheHits++;
        } else {
          metrics.cacheMisses++;
        }
        if (res.diagnostic) {
          componentDiagnostics.push(res.diagnostic);
          const t = res.diagnostic.generationTimeMs || 0;
          totalCompTime += t;
          if (t > maxCompTime) maxCompTime = t;
        }
        if (res.error) {
          newErrors.push(res.error);
        }
      }

      const parallelDuration = Date.now() - parallelStartTime;
      metrics.parallelEfficiency = parallelDuration > 0 && maxCompTime > 0
        ? Math.min(100, Math.round((totalCompTime / (parallelDuration * componentsToGenerate.length)) * 100))
        : 100;

      // 3. Complete Bundle Validation & Self-Healing Pipeline (Requirements 1-14)
      if (!generatedFiles['App.tsx']) {
         generatedFiles['App.tsx'] = this.generateAppFromModel(componentsToGenerate, state.data_model || {});
      }
      
      const requiredNames = componentsToGenerate.map(c => c.name);
      
      // Step A: Basic structural validation (App.tsx tags & data prop contract)
      let bundleCheck = this.bundleValidator.validateBundle(generatedFiles, requiredNames);
      if (!bundleCheck.valid) {
         console.warn(`[IntegratorAgent] ⚠️ Basic bundle check failed. App.tsx errors: ${bundleCheck.errors.join(', ')}`);
         metrics.validationErrors++;
         try {
           const repairAgent = new CodeRepairAgent(this.initialLlmProvider!);
           const repairedApp = await repairAgent.repair('App', generatedFiles['App.tsx'], bundleCheck.errors);
           const tempFiles = { ...generatedFiles, 'App.tsx': repairedApp };
           const postValidation = this.bundleValidator.validateBundle(tempFiles, requiredNames);
           if (postValidation.valid) {
              generatedFiles['App.tsx'] = tempFiles['App.tsx'];
              console.log(`[IntegratorAgent] ✅ Successfully repaired App.tsx basic issues.`);
           } else {
              console.warn(`[IntegratorAgent] ⚠️ Repair attempt for App.tsx still invalid. Falling back to deterministic App.tsx.`);
              generatedFiles['App.tsx'] = this.generateAppFromModel(componentsToGenerate, state.data_model || {});
              this.bundleValidator.validateBundle(generatedFiles, requiredNames);
           }
         } catch(e) {
           console.error('[IntegratorAgent] App.tsx basic repair failed.', e);
           generatedFiles['App.tsx'] = this.generateAppFromModel(componentsToGenerate, state.data_model || {});
           this.bundleValidator.validateBundle(generatedFiles, requiredNames);
         }
      }

      // Step B: Complete Code-Generation/Rendering Self-Healing Pipeline
      const repairAgent = new CodeRepairAgent(this.initialLlmProvider!);
      const maxBundleRepairs = 3;
      let bundleRepairAttempt = 0;
      let bundleResult = compileBundle(generatedFiles);

      console.log(`\n====================================================`);
      console.log(`[IntegratorAgent] 🔍 STARTING DEPENDENCY & BUNDLE SELF-HEALING PIPELINE`);
      console.log(`Generated files: [${Object.keys(generatedFiles).join(', ')}]`);
      console.log(`Initial compilation status: ${bundleResult.success ? 'PASS ✅' : 'FAIL ❌'}`);
      if (!bundleResult.success) {
        console.log(`Discovered errors (${bundleResult.diagnostics.length}):`);
        bundleResult.diagnostics.forEach(d => console.log(`  - [${d.type}] ${d.message}`));
      }
      console.log(`====================================================\n`);

      while (!bundleResult.success && bundleRepairAttempt < maxBundleRepairs) {
        bundleRepairAttempt++;
        metrics.repairCount++;
        metrics.validationErrors++;
        console.log(`[IntegratorAgent] 🛠 Self-Healing Repair Attempt ${bundleRepairAttempt}/${maxBundleRepairs}...`);

        const fatalDiagnostics = bundleResult.diagnostics.filter(d => d.type !== 'BUNDLE_VALID');

        for (const diag of fatalDiagnostics) {
          console.log(`\nBUILD VALIDATION FAILED\n\nFile: ${diag.source || 'bundle.tsx'}\nLine: ${diag.line || 1}\nColumn: ${diag.column || 1}\n\nError:\n${diag.message}\n\nDetected issue:\n${diag.detectedIssue || diag.message}\n\nAttempt: ${bundleRepairAttempt}/${maxBundleRepairs}\n`);

          if (diag.type === 'MARKDOWN_FENCE' && diag.source && generatedFiles[diag.source]) {
            console.log(`Repair:\nRemoved Markdown fence and revalidated.\n`);
            generatedFiles[diag.source] = ResponseNormalizer.cleanCode(generatedFiles[diag.source]);
            continue;
          }

          if (diag.type === 'MISSING_DEPENDENCY' && diag.dependency) {
            const missingCompName = diag.dependency;
            const missingFileName = `${missingCompName}.tsx`;

            if (!generatedFiles[missingFileName]) {
              console.log(`Repair:\nGenerating missing component "${missingFileName}" and revalidating.\n`);
              const generatedCode = await repairAgent.generateMissingComponent(
                missingCompName,
                diag.source || 'App.tsx'
              );

              if (generatedCode && (generatedCode.includes('function') || generatedCode.includes('const') || generatedCode.includes('return'))) {
                generatedFiles[missingFileName] = ResponseNormalizer.cleanCode(generatedCode);
                console.log(`[IntegratorAgent] ✅ Successfully generated "${missingFileName}".`);
                continue;
              }
            }

            if (diag.source && generatedFiles[diag.source]) {
              console.log(`Repair:\nAuto-sanitizing invalid import "${missingCompName}" in "${diag.source}" and revalidating.\n`);
              let sourceCode = generatedFiles[diag.source];

              const impRegex = new RegExp(`import\\s+.*?from\\s+['"].*?${missingCompName}['"]\\s*;?`, 'g');
              sourceCode = sourceCode.replace(impRegex, '');

              if (missingCompName === 'Button') {
                sourceCode = sourceCode
                  .replace(/<Button\b([^>]*)>(.*?)<\/Button>/g, '<button className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all" $1>$2</button>')
                  .replace(/<Button\b([^>]*)\/>/g, '<button className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all">Action</button>');
              } else {
                sourceCode = sourceCode
                  .replace(new RegExp(`<${missingCompName}\\b([^>]*)>(.*?)</${missingCompName}>`, 'g'), '<div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700" $1>$2</div>')
                  .replace(new RegExp(`<${missingCompName}\\b([^>]*)\\/>`, 'g'), `<div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 font-mono text-xs text-slate-300">${missingCompName}</div>`);
              }

              generatedFiles[diag.source] = ResponseNormalizer.cleanCode(sourceCode);
            }
          } else if (diag.type === 'EXPORT_MISMATCH' && diag.source && generatedFiles[diag.source]) {
            console.log(`Repair:\nFixing export mismatch in "${diag.source}" and revalidating.\n`);
            try {
              const repaired = await repairAgent.repair(
                diag.source.replace('.tsx', ''),
                generatedFiles[diag.source],
                [diag.message]
              );
              if (repaired) generatedFiles[diag.source] = ResponseNormalizer.cleanCode(repaired);
            } catch (e) {
              console.error(`Export repair failed for ${diag.source}:`, e);
            }
          } else if (diag.source && generatedFiles[diag.source]) {
            console.log(`Repair:\nFixing syntax/code error in "${diag.source}" and revalidating.\n`);
            try {
              const repaired = await repairAgent.repair(
                diag.source.replace('.tsx', ''),
                generatedFiles[diag.source],
                [diag.message]
              );
              if (repaired) generatedFiles[diag.source] = ResponseNormalizer.cleanCode(repaired);
            } catch (e) {
              console.error(`Code repair failed for ${diag.source}:`, e);
            }
          }
        }

        // Re-evaluate bundle after repair iteration
        this.bundleValidator.validateBundle(generatedFiles, requiredNames);
        bundleResult = compileBundle(generatedFiles);
      }

      console.log(`\n====================================================`);
      console.log(`[IntegratorAgent] 📊 FINAL PIPELINE BUNDLE BUILD RESULT:`);
      console.log(`Generated Files: [${Object.keys(generatedFiles).join(', ')}]`);
      console.log(`Validation Result: ${bundleResult.success ? 'PASS ✅' : 'FAIL ❌'}`);
      console.log(`Final Execution Order: [${bundleResult.executionOrder.join(', ')}]`);
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
      // Clear generatedFiles to prevent duplicate component declarations when falling back to a single-file template
      for (const k of Object.keys(generatedFiles)) {
        delete generatedFiles[k];
      }
      generatedFiles['App.tsx'] = appTsx;
      generatedFiles['index.css'] = '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n';
      console.log(`[IntegratorAgent] ⚠️ Using template fallback for ${category} due to: ${fallbackReason}`);
    }

    metrics.generationTimeMs = Date.now() - startTime;

    const logMessage = usedTemplateFallback
      ? `Template fallback used for "${category}". Reason: ${fallbackReason}`
      : `AI orchestrated ${Object.keys(generatedFiles).length} components in ${metrics.generationTimeMs}ms.`;

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

  private generatePlaceholder(componentName: string): string {
    return `import React from 'react';\n\nexport default function ${componentName}() {\n  return (\n    <div className="p-4 border border-rose-500 bg-rose-50 text-rose-500 rounded my-2">\n      Failed to generate component: ${componentName}\n    </div>\n  );\n}\n`;
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
