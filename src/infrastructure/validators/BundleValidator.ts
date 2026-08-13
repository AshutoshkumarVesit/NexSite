import { SupportedDependencyRegistry } from '../registry/SupportedDependencyRegistry';

export class BundleValidator {
  public validateBundle(generatedFiles: Record<string, string>, requiredComponents: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if App.tsx exists
    let appTsx = generatedFiles['App.tsx'];
    if (!appTsx) {
      errors.push('Bundle is missing App.tsx.');
      return { valid: false, errors };
    }

    // Validate external dependencies across all files
    const importRegex = /import\s+(?:type\s+)?(?:(?:\w+\s*,?\s*)?(?:\{[^}]*\}\s*from\s*)?['"]([^'"]+)['"]|(?:\{[^}]*\}\s*from\s*['"]([^'"]+)['"])|['"]([^'"]+)['"])/g;
    for (const [fileName, code] of Object.entries(generatedFiles)) {
      if (!fileName.endsWith('.tsx') && !fileName.endsWith('.ts')) continue;
      let m: RegExpExecArray | null;
      importRegex.lastIndex = 0;
      while ((m = importRegex.exec(code)) !== null) {
        const source = m[1] || m[2] || m[3];
        if (source && !source.startsWith('./') && !source.startsWith('../')) {
          if (!SupportedDependencyRegistry.isSupported(source)) {
            errors.push(`File "${fileName}" imports unsupported external package "${source}". Only supported packages are allowed: [${SupportedDependencyRegistry.getSupportedDependencies().join(', ')}].`);
          }
        }
      }
    }

    const availableTsxFiles = Object.keys(generatedFiles).filter(f => f.endsWith('.tsx') && f !== 'App.tsx');
    const availableCompNames = availableTsxFiles.map(f => f.replace('.tsx', ''));

    // Check if all planned components were generated and exported correctly
    for (const compName of requiredComponents) {
      if (compName === 'App') continue;
      const fileName = `${compName}.tsx`;
      const code = generatedFiles[fileName];

      if (!code) {
        errors.push(`Planned component file "${fileName}" is missing from the bundle.`);
      } else {
        // Verify export matches component name or export default exists
        if (!code.includes(`function ${compName}`) && !code.includes('export default') && !code.includes(`const ${compName}`)) {
          errors.push(`Component file "${fileName}" does not export matching component name "${compName}".`);
        }
      }
    }

    // Auto-rewrite / normalize component usages in App.tsx
    for (const realCompName of availableCompNames) {
      const aliases = [
        realCompName + 'Section',
        realCompName + 'Component',
        realCompName.endsWith('s') ? realCompName.slice(0, -1) : realCompName + 's'
      ];

      for (const alias of aliases) {
        if (alias !== realCompName && appTsx.includes(`<${alias}`)) {
          console.log(`[BundleValidator] 🔄 Auto-rewriting JSX tag <${alias}> to <${realCompName}> in App.tsx`);
          const regexOpen = new RegExp(`<${alias}([\\s/>])`, 'g');
          const regexClose = new RegExp(`</${alias}>`, 'g');
          appTsx = appTsx.replace(regexOpen, `<${realCompName}$1`).replace(regexClose, `</${realCompName}>`);
          generatedFiles['App.tsx'] = appTsx;
        }
      }
    }

    // Auto-inject missing imports for known components in all files
    for (const [fileName, code] of Object.entries(generatedFiles)) {
      if (!fileName.endsWith('.tsx') && !fileName.endsWith('.ts')) continue;
      let modifiedCode = code;
      
      for (const compName of availableCompNames) {
        // Skip self
        if (fileName === `${compName}.tsx`) continue;
        
        // If the component is used as a tag
        const tagRegex = new RegExp(`<${compName}[\\s/>]`);
        if (tagRegex.test(modifiedCode)) {
          // Check if there is an import for it (basic check)
          const importRegex = new RegExp(`import\\s+.*?${compName}.*?\\s+from\\s+['"]\\.?\\/?${compName}['"]`);
          if (!importRegex.test(modifiedCode)) {
            console.log(`[BundleValidator] 🔄 Auto-injecting missing import for ${compName} into ${fileName}`);
            // Find the last import statement, or just prepend at the top after React if it exists
            modifiedCode = `import ${compName} from './${compName}';\n` + modifiedCode;
          }
        }
      }
      
      if (modifiedCode !== code) {
        generatedFiles[fileName] = modifiedCode;
        if (fileName === 'App.tsx') {
          appTsx = modifiedCode;
        }
      }
    }

    // Check if App.tsx uses/imports the required components
    for (const compName of requiredComponents) {
      if (compName !== 'App') {
        const childTagRegex = new RegExp(`<${compName}\\s+([^>]*?)>`, 'g');
        let found = false;
        let hasDataProp = false;

        let match;
        while ((match = childTagRegex.exec(appTsx)) !== null) {
          found = true;
          if (match[1] && match[1].includes('data=')) {
            hasDataProp = true;
          }
        }

        if (!found) {
          const altRegex = new RegExp(`<${compName}(?:\\s+[^>]*|\\s*)/>`);
          const altMatch = appTsx.match(altRegex);
          if (altMatch) {
            found = true;
            if (altMatch[0].includes('data=')) hasDataProp = true;
          }
        }

        if (!found) {
          errors.push(`App.tsx is missing <${compName} /> component tag.`);
        } else if (!hasDataProp) {
          errors.push(`App.tsx renders <${compName} /> but does not pass a 'data=' prop from the shared data model.`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
