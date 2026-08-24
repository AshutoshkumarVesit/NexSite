import { SyntaxValidator } from '../validators/SyntaxValidator';

export class ComponentValidatorAgent {
  public validate(code: string, expectedFileName: string, rawResponseForDebug?: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!code || code.trim().length === 0) {
      let received = 'undefined';
      try {
        received = JSON.stringify(rawResponseForDebug);
      } catch (e) {
        received = String(rawResponseForDebug);
      }
      errors.push(`Component code is empty. Received: ${received}`);
      return { valid: false, errors };
    }

    if (code.length < 50) {
      errors.push('Component code is suspiciously short (under 50 characters).');
    }

    const trimmed = code.trim();

    // Check for markdown fences
    if (trimmed.startsWith('\`\`\`') || trimmed.endsWith('\`\`\`')) {
      errors.push('Code contains raw unstripped markdown fences (\`\`\`).');
    }

    // Check for raw JSON wrapping
    if (trimmed.startsWith('{') && trimmed.endsWith('}') && (trimmed.includes(`"${expectedFileName}"`) || trimmed.includes('"code"'))) {
      errors.push('Code appears to be wrapped in raw JSON format instead of plain string.');
    }

    // Check exports
    const hasExportDefault = trimmed.includes('export default');
    const hasExportFunction = trimmed.includes('export function');
    const hasExportConst = trimmed.includes('export const');

    // Check for defensive programming missing in .map calls
    if (/\w+\.map\s*\(/.test(code) && !/\?\./.test(code)) {
      errors.push('Found .map() without optional chaining (e.g., data?.items?.map). Components must be defensive.');
    }

    // Check for unparenthesized nullish coalescing .map calls
    if (/([a-zA-Z0-9_$.?]+)\s*\?\?\s*\[\]\.map/.test(code)) {
      errors.push('Invalid syntax: "data?.links ?? [].map(...)". You MUST wrap in parentheses: "(data?.links ?? []).map(...)".');
    }

    // Check for naked props access
    const dangerousNakedProps = ['data.name', 'data.title', 'data.image', 'data.items', 'data.links'];
    for (const prop of dangerousNakedProps) {
      if (code.includes(prop) && !code.includes(prop.replace('.', '?.'))) {
        errors.push(`Dangerous naked prop access found: ${prop}. You MUST use optional chaining or defaults (e.g. data?.name).`);
      }
    }

    // Check for missing safe defaults in signature
    if (code.includes('export default function') && code.includes('({ data })') && !code.includes('data =')) {
      errors.push('Component signature missing safe default for data prop (e.g. { data = {} }).');
    }

    if (!hasExportDefault && !hasExportFunction && !hasExportConst) {
      errors.push('Missing export declaration. Must use "export default", "export function", or "export const".');
    }

    // Check JSX
    const hasJSX = trimmed.includes('<') && (trimmed.includes('/>') || trimmed.includes('</'));
    const hasReactCreateElement = trimmed.includes('React.createElement');
    
    if (!hasJSX && !hasReactCreateElement) {
      errors.push('No JSX or React.createElement detected. Component does not render anything.');
    }

    // Check for duplicate identifier '__default_export__' which ruins our eval logic
    if (trimmed.includes('__default_export__')) {
      errors.push('Code cannot contain the internal variable "__default_export__".');
    }

    // Check truncation
    const lastChar = trimmed[trimmed.length - 1];
    if (['+', '-', '*', '/', '=', ':', ',', '<', '(', '{'].includes(lastChar)) {
      errors.push(`Code appears truncated (ends abruptly with '${lastChar}').`);
    }

    // Call the real TS AST parser
    const syntaxDiagnostics = SyntaxValidator.validateFile(expectedFileName, code);
    if (syntaxDiagnostics.length > 0) {
      for (const diag of syntaxDiagnostics) {
        errors.push(diag.message);
      }
    }

    // ── Visual Quality Checks (warnings logged, not hard failures) ──
    const warnings: string[] = [];

    // Check for parent-app navigation (hard error — this breaks the preview)
    if (/href\s*=\s*["']\/["']/.test(code) && !code.includes('scrollIntoView') && !code.includes('#')) {
      errors.push('Component contains href="/" which navigates to the parent application. Use "#sectionId" anchors or onClick scroll handlers instead.');
    }
    if (/href\s*=\s*["']https?:\/\/localhost/.test(code)) {
      errors.push('Component contains href pointing to localhost. Generated websites must not navigate to the parent application.');
    }

    // Warn: img without alt
    if (/<img\b/.test(code) && !(/alt\s*=/.test(code))) {
      warnings.push(`[Quality] ${expectedFileName}: <img> tag found without alt attribute.`);
    }

    // Warn: img without onError fallback
    if (/<img\b/.test(code) && !(/onError/.test(code))) {
      warnings.push(`[Quality] ${expectedFileName}: <img> tag found without onError fallback. Images may break.`);
    }

    // Warn: no responsive breakpoints in non-App components
    if (!expectedFileName.includes('App') && code.length > 200) {
      if (!/(?:sm:|md:|lg:|xl:)/.test(code)) {
        warnings.push(`[Quality] ${expectedFileName}: No responsive breakpoint classes (sm:/md:/lg:) detected.`);
      }
    }

    // Warn: suspiciously short component (likely placeholder)
    if (code.length < 200 && !expectedFileName.includes('App')) {
      warnings.push(`[Quality] ${expectedFileName}: Component is very short (${code.length} chars). May be a placeholder.`);
    }

    // Log warnings (don't fail validation for these)
    for (const w of warnings) {
      console.warn(`[ComponentValidator] ${w}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
