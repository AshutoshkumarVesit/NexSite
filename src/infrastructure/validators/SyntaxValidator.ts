import ts from 'typescript';

export interface SyntaxDiagnostic {
  type: 'SYNTAX_ERROR' | 'MARKDOWN_FENCE';
  source: string;
  line?: number;
  column?: number;
  message: string;
  codeSnippet?: string;
  detectedIssue?: string;
}

export class SyntaxValidator {
  /**
   * Validates syntax of a single generated TS/TSX file before bundle compilation.
   * Detects markdown fences and uses the TypeScript compiler API to catch any
   * parse errors (unclosed JSX, malformed expressions, unterminated strings, etc.)
   */
  public static validateFile(fileName: string, code: string): SyntaxDiagnostic[] {
    const diagnostics: SyntaxDiagnostic[] = [];

    // 1. Detect unhandled Markdown code fences in source
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*```[a-zA-Z]*\s*$/.test(lines[i])) {
        diagnostics.push({
          type: 'MARKDOWN_FENCE',
          source: fileName,
          line: i + 1,
          column: 1,
          message: `Markdown code fence delimiter found in "${fileName}" at line ${i + 1}`,
          codeSnippet: lines[i],
          detectedIssue: 'Markdown code fence found in source.'
        });
        return diagnostics; // Fail early if markdown fence is found
      }
    }

    // 2. Real syntax validation using the TypeScript Compiler API
    const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const parseDiagnostics = (sourceFile as any).parseDiagnostics;
    
    if (parseDiagnostics && parseDiagnostics.length > 0) {
      for (const diag of parseDiagnostics) {
        let line = 1;
        let column = 1;
        if (diag.start !== undefined) {
          const lc = ts.getLineAndCharacterOfPosition(sourceFile, diag.start);
          line = lc.line + 1;
          column = lc.character + 1;
        }
        const message = typeof diag.messageText === 'string' ? diag.messageText : diag.messageText?.messageText || 'Syntax error';
        
        diagnostics.push({
          type: 'SYNTAX_ERROR',
          source: fileName,
          line,
          column,
          message: `Syntax Error at line ${line}, col ${column}: ${message}`,
          detectedIssue: `Syntax Error: ${message}`
        });
      }
    }

    return diagnostics;
  }

  /**
   * Validates all files in generatedFiles map.
   */
  public static validateAllFiles(generatedFiles: Record<string, string>): SyntaxDiagnostic[] {
    const allDiagnostics: SyntaxDiagnostic[] = [];
    for (const [key, code] of Object.entries(generatedFiles)) {
      const fileName = key.split('/').pop() || key;
      if (fileName.endsWith('.tsx') || fileName.endsWith('.ts')) {
        const fileErrors = this.validateFile(fileName, code);
        allDiagnostics.push(...fileErrors);
      }
    }
    return allDiagnostics;
  }
}
