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
  private extractFiles(raw: any, _components: ComponentDefinition[]): Record<string, string> {
    const files: Record<string, string> = {};
    if (!raw) return files;

    // Helper to register file with clean code
    const addFile = (key: string, val: any) => {
      if (typeof val === 'string' && val.trim().length > 10) {
        const fileName = key.endsWith('.tsx') ? key : `${key}.tsx`;
        files[fileName] = val.trim();
      } else if (val && typeof val === 'object') {
        const codeStr = val.code || val.content || val.source || val.tsx;
        if (typeof codeStr === 'string' && codeStr.trim().length > 10) {
          const fileName = key.endsWith('.tsx') ? key : `${key}.tsx`;
          files[fileName] = codeStr.trim();
        }
      }
    };

    // Shape 1: { files: { "Navbar.tsx": "..." } } or { "Navbar.tsx": "..." }
    const filesObj = raw.files || raw.components || raw.data || raw;

    if (Array.isArray(filesObj)) {
      // Shape: [ { name: "Navbar.tsx", code: "..." } ]
      for (const item of filesObj) {
        if (item && typeof item === 'object') {
          const name = item.name || item.fileName || item.filename || item.path || item.component;
          const code = item.code || item.content || item.source || item.tsx || item.codeString;
          if (name && typeof code === 'string') {
            addFile(name, code);
          }
        }
      }
    } else if (typeof filesObj === 'object' && filesObj !== null) {
      for (const [key, value] of Object.entries(filesObj)) {
        addFile(key, value);
      }
    }

    // Shape 2: raw string containing JSON or code
    if (typeof raw === 'string' && Object.keys(files).length === 0) {
      try {
        const parsed = JSON.parse(raw);
        return this.extractFiles(parsed, _components);
      } catch {
        if (raw.includes('export default') || raw.includes('function') || raw.includes('const App')) {
          files['App.tsx'] = raw.trim();
        }
      }
    }

    return files;
  }

  private generatePlaceholder(componentName: string): string {
    const lower = componentName.toLowerCase();

    if (lower.includes('nav')) {
      return `import React, { useState } from 'react';
import { Menu, X, Sparkles } from 'lucide-react';

export default function ${componentName}({ data = {} }: { data?: any }) {
  const [open, setOpen] = useState(false);
  const { title = 'NexSite', links = [
    { label: 'Features', href: '#features' },
    { label: 'About', href: '#about' },
    { label: 'Reviews', href: '#testimonials' }
  ], cta = { text: 'Get Started', href: '#features' } } = (data || {});

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/60 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl text-white tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <span>{title}</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {(links || []).map((link: any, i: number) => (
            <a key={i} href={link.href || '#'} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              {link.label || 'Link'}
            </a>
          ))}
        </div>
        <div className="hidden md:flex items-center">
          <a href={cta?.href || '#'} className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold shadow-md shadow-violet-500/20 transition-all hover:scale-105 active:scale-95">
            {cta?.text || 'Get Started'}
          </a>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden text-slate-300 hover:text-white p-2">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden pt-4 pb-2 border-t border-slate-800/60 mt-3 space-y-3">
          {(links || []).map((link: any, i: number) => (
            <a key={i} href={link.href || '#'} onClick={() => setOpen(false)} className="block text-slate-300 hover:text-white text-sm font-medium py-1">
              {link.label}
            </a>
          ))}
          <a href={cta?.href || '#'} onClick={() => setOpen(false)} className="block text-center px-4 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm">
            {cta?.text || 'Get Started'}
          </a>
        </div>
      )}
    </nav>
  );
}
`;
    }

    if (lower.includes('footer')) {
      return `import React from 'react';
import { Sparkles } from 'lucide-react';

export default function ${componentName}({ data = {} }: { data?: any }) {
  const {
    copyright = \`© \${new Date().getFullYear()} NexSite. All rights reserved.\`,
    links = [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Support', href: '#' }
    ]
  } = (data || {});

  return (
    <footer className="py-12 px-6 bg-slate-950 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 font-bold text-white tracking-tight">
          <div className="w-7 h-7 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <span>NexSite</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-400">
          {(links || []).map((link: any, i: number) => (
            <a key={i} href={link.href || '#'} className="hover:text-white transition-colors">
              {link.label || link}
            </a>
          ))}
        </div>
        <p className="text-xs text-slate-500">{copyright}</p>
      </div>
    </footer>
  );
}
`;
    }

    if (lower.includes('testimonial') || lower.includes('review')) {
      return `import React from 'react';
import { Star } from 'lucide-react';

export default function ${componentName}({ data = {} }: { data?: any }) {
  const {
    title = 'Loved by Customers & Professionals',
    subtitle = 'Discover why thousands of members trust our platform every day.',
    items = [
      { name: 'Sarah Chen', role: 'Verified Customer', quote: 'The speed, elegance, and quality have exceeded all of our expectations.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' },
      { name: 'Marcus Vance', role: 'Founder, Studio Pulse', quote: 'Meticulously crafted with world-class aesthetics and unmatched attention to detail.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' }
    ]
  } = (data || {});

  return (
    <section id="testimonials" className="py-20 md:py-28 px-6 bg-slate-900/40">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">{title}</h2>
          <p className="text-slate-400 text-lg">{subtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {(items || []).map((item: any, i: number) => (
            <div key={i} className="p-8 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
              <div className="flex gap-1 text-amber-400 mb-4">
                {[...Array(5)].map((_, idx) => <Star key={idx} className="w-4 h-4 fill-amber-400" />)}
              </div>
              <p className="text-slate-200 italic mb-6 leading-relaxed">"{item.quote || 'Outstanding service and quality.'}"</p>
              <div className="flex items-center gap-3">
                <img src={item.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop'} alt={item.name} className="w-10 h-10 rounded-full object-cover border border-violet-500/30" />
                <div>
                  <div className="font-semibold text-white text-sm">{item.name || 'Alex Morgan'}</div>
                  <div className="text-xs text-slate-400">{item.role || 'Member'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
    }

    // Default rich feature / content card section
    return `import React from 'react';
import { Sparkles, Shield, Zap } from 'lucide-react';

export default function ${componentName}({ data = {} }: { data?: any }) {
  const {
    title = '${componentName}',
    subtitle = 'Discover premium capabilities designed with precision and uncompromising standards.',
    items = [
      { title: 'Lightning Fast', description: 'Near-zero latency and instant responsive interaction.', icon: 'Zap' },
      { title: 'Precision Craft', description: 'Engineered with meticulous attention to detail and visual elegance.', icon: 'Sparkles' },
      { title: 'Reliable & Secure', description: 'Built for enterprise durability and guaranteed satisfaction.', icon: 'Shield' }
    ]
  } = (data || {});

  const iconMap: Record<string, any> = { Zap, Sparkles, Shield };

  return (
    <section id="${componentName.toLowerCase()}" className="py-20 md:py-28 px-6 bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">{title}</h2>
          <p className="text-slate-400 text-lg">{subtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(items || []).map((item: any, i: number) => {
            const IconComp = iconMap[item.icon] || Sparkles;
            return (
              <div key={i} className="group p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-6 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <IconComp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title || 'Feature'}</h3>
                <p className="text-slate-400 leading-relaxed">{item.description || 'Details and specifications.'}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
`;
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
