export class ResponseNormalizer {
  /**
   * Utility to strip markdown fences, extract code blocks from explanatory text, and trim code.
   */
  public static cleanCode(str: unknown): string {
    if (typeof str !== 'string') return '';
    let code = str.trim();

    // 1. Extract TSX/TS code block if surrounded by explanatory text or markdown fences
    // E.g. "Here is the code:\n```tsx\nimport React ...\n```\nHope this helps!"
    const fenceBlockMatch = code.match(/```(?:tsx|typescript|jsx|ts|javascript|js)?[\r\n]+([\s\S]*?)```/i);
    if (fenceBlockMatch && fenceBlockMatch[1]) {
      code = fenceBlockMatch[1].trim();
    }

    // 2. Strip opening markdown code fences at start of text if any remain
    code = code.replace(/^(?:\s*```[a-zA-Z]*[\r\n]*)+/, '');

    // 3. Strip closing markdown code fences at end of text if any remain
    code = code.replace(/(?:[\r\n]*```\s*)+$/, '');

    // 4. Line-by-line cleanup of stray top-level fence delimiters (outside strings/JSX)
    const lines = code.split('\n');
    const cleanedLines: string[] = [];
    for (const line of lines) {
      if (/^\s*```[a-zA-Z]*\s*$/.test(line)) {
        continue;
      }
      cleanedLines.push(line);
    }
    code = cleanedLines.join('\n').trim();

    // 5. Fix unparenthesized nullish coalescing array map syntax errors:
    // e.g. data?.links ?? [].map(...) -> (data?.links ?? []).map(...)
    code = code.replace(/(\{?\s*)([a-zA-Z0-9_$.?]+)\s*\?\?\s*\[\]\.map\(/g, '$1($2 ?? []).map(');

    return code;
  }

  /**
   * Normalizes an LLM response into a deterministic { fileName, code } object.
   * Strips markdown fences, handles various JSON formats, and prevents .trim() exceptions.
   */
  public static normalize(rawResponse: any, expectedFileName: string): { fileName: string; code: string; type: string } {
    let normalizedCode = '';
    const responseType = typeof rawResponse;
    const lowerExpectedName = expectedFileName.toLowerCase();

    if (rawResponse === null || rawResponse === undefined) {
      return { fileName: expectedFileName, code: '', type: 'undefined/null' };
    }

    if (responseType === 'string') {
      normalizedCode = ResponseNormalizer.cleanCode(rawResponse);
      return { fileName: expectedFileName, code: normalizedCode, type: 'string' };
    }

    if (responseType === 'object') {
      if (Array.isArray(rawResponse)) {
        return { fileName: expectedFileName, code: '', type: 'array' };
      }

      // Format A: { "Navbar.tsx": "..." }
      if (typeof rawResponse[expectedFileName] === 'string') {
        normalizedCode = ResponseNormalizer.cleanCode(rawResponse[expectedFileName]);
        return { fileName: expectedFileName, code: normalizedCode, type: 'object (exact match)' };
      }

      // Format D: { "files": { "Navbar.tsx": "..." } }
      if (rawResponse.files && typeof rawResponse.files === 'object') {
        if (typeof rawResponse.files[expectedFileName] === 'string') {
          normalizedCode = ResponseNormalizer.cleanCode(rawResponse.files[expectedFileName]);
          return { fileName: expectedFileName, code: normalizedCode, type: 'object (files match)' };
        }
        for (const [key, val] of Object.entries(rawResponse.files)) {
          if (key.toLowerCase() === lowerExpectedName && typeof val === 'string') {
            return { fileName: expectedFileName, code: ResponseNormalizer.cleanCode(val), type: 'object (files match case-insensitive)' };
          }
        }
      }

      // Format B & C: { "code": "..." } or { "component": "..." }
      if (typeof rawResponse.code === 'string') {
        normalizedCode = ResponseNormalizer.cleanCode(rawResponse.code);
        return { fileName: expectedFileName, code: normalizedCode, type: 'object (code key)' };
      }
      if (typeof rawResponse.component === 'string') {
        normalizedCode = ResponseNormalizer.cleanCode(rawResponse.component);
        return { fileName: expectedFileName, code: normalizedCode, type: 'object (component key)' };
      }

      // Case-insensitive key match (normalizing directory paths)
      for (const [key, val] of Object.entries(rawResponse)) {
        const normKey = (key.split('/').pop() || key).toLowerCase();
        if (normKey === lowerExpectedName || normKey === lowerExpectedName.replace('.tsx', '')) {
          if (typeof val === 'string') {
            return { fileName: expectedFileName, code: ResponseNormalizer.cleanCode(val), type: 'object (fuzzy key match)' };
          }
        }
      }

      // Desperate fallback: Look for any string value that smells like a React component
      for (const val of Object.values(rawResponse)) {
        if (typeof val === 'string' && (val.includes('export default') || val.includes('return'))) {
          return { fileName: expectedFileName, code: ResponseNormalizer.cleanCode(val), type: 'object (fuzzy content match)' };
        }
      }

      return { fileName: expectedFileName, code: '', type: 'object (no code found)' };
    }

    return { fileName: expectedFileName, code: '', type: responseType };
  }
}
