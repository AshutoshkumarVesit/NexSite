import type { ILLMProvider } from '../../core/interfaces/ILLMProvider';
import { CODE_REPAIR_PROMPT } from '../../prompts/code_repair.prompt';

export class CodeRepairAgent {
  private llmProvider: ILLMProvider;

  constructor(llmProvider: ILLMProvider) {
    this.llmProvider = llmProvider;
  }

  public async repair(
    componentName: string,
    malformedCode: string,
    errors: string[]
  ): Promise<string> {
    const promptText = CODE_REPAIR_PROMPT
      .replace('{component_name}', componentName)
      .replace('{validation_errors}', errors.map(e => `- ${e}`).join('\n'))
      .replace('{malformed_code}', malformedCode);

    const fileName = `${componentName}.tsx`;

    try {
      const rawResult = await this.llmProvider.generateJSON<any>(
        promptText,
        `JSON object with key "${fileName}" containing repaired React component code`
      );
      return this.normalizeComponentResponse(rawResult, fileName);
    } catch (err) {
      console.error(`[CodeRepairAgent] Failed to repair ${componentName}:`, err);
      throw err;
    }
  }

  public async generateMissingComponent(
    componentName: string,
    requestedByFile: string
  ): Promise<string> {
    const fileName = `${componentName}.tsx`;
    const promptText = `You are an expert React developer specializing in Tailwind CSS.
The file "${requestedByFile}" imported or referenced a missing local component named "${componentName}".
Generate a complete, self-contained React component file named "${fileName}".

REQUIREMENTS:
1. Export default function ${componentName}(props: any) { ... }
2. Use Tailwind CSS for modern, high-quality styling.
3. Accept standard props (children, className, onClick, data, title, variant, etc.) with safe default fallback values.
4. Ensure the component renders cleanly without throwing any runtime errors.

Return ONLY a JSON object:
{
  "${fileName}": "import React from 'react';\\nexport default function ${componentName}(props) { ... }"
}`;

    try {
      const rawResult = await this.llmProvider.generateJSON<any>(
        promptText,
        `JSON object with key "${fileName}" containing React component code`
      );
      return this.normalizeComponentResponse(rawResult, fileName);
    } catch (err) {
      console.error(`[CodeRepairAgent] Failed to generate missing component ${componentName}:`, err);
      return '';
    }
  }

  // Same robust normalization logic
  private normalizeComponentResponse(raw: any, expectedFileName: string): string {
    if (!raw) return '';

    if (typeof raw === 'string') {
      let code = raw.trim();
      if (code.startsWith('\`\`\`')) {
        code = code.replace(/^\`\`\`[a-zA-Z]*[\r\n]*/, '').replace(/[\r\n]*\`\`\`$/, '').trim();
      }
      return code;
    }

    if (typeof raw === 'object') {
      if (raw.files && typeof raw.files[expectedFileName] === 'string') return raw.files[expectedFileName].trim();
      if (typeof raw[expectedFileName] === 'string') return raw[expectedFileName].trim();
      
      const lowerName = expectedFileName.toLowerCase();
      for (const key of Object.keys(raw)) {
        if (key.toLowerCase() === lowerName || key.toLowerCase() === lowerName.replace('.tsx', '')) {
          if (typeof raw[key] === 'string') {
            return raw[key].trim();
          }
        }
      }

      for (const val of Object.values(raw)) {
        if (typeof val === 'string' && (val.includes('export default') || val.includes('return'))) {
          let code = val.trim();
          if (code.startsWith('\`\`\`')) {
            code = code.replace(/^\`\`\`[a-zA-Z]*[\r\n]*/, '').replace(/[\r\n]*\`\`\`$/, '').trim();
          }
          return code;
        }
      }
    }

    return '';
  }
}
