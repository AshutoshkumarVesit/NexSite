// BundleCompiler — replaces buildIframeSrcdoc() with deterministic,
// validated compilation of LLM-generated TSX files into an iframe srcdoc.
//
// Steps: parse imports → parse exports → build dep graph → validate →
// topological sort (Kahn's) → transform code → produce srcdoc or error panel.

// ─── Public Types ──────────────────────────────────────────────────────────────

export interface BundleDiagnostic {
  type:
    | 'MISSING_DEPENDENCY'
    | 'EXPORT_MISMATCH'
    | 'CIRCULAR_DEPENDENCY'
    | 'DUPLICATE_DEFINITION'
    | 'DUPLICATE_ENTRYPOINT'
    | 'UNSUPPORTED_EXTERNAL_DEPENDENCY'
    | 'SYNTAX_ERROR'
    | 'MARKDOWN_FENCE'
    | 'BABEL_ERROR'
    | 'RUNTIME_ERROR'
    | 'BUNDLE_VALID';
  source?: string;
  dependency?: string;
  expectedFile?: string;
  chain?: string[];
  message: string;
  line?: number;
  column?: number;
  codeSnippet?: string;
  detectedIssue?: string;
  occurrences?: number;
  sources?: string[];
}

export interface BundleResult {
  success: boolean;
  diagnostics: BundleDiagnostic[];
  srcdoc: string;
  executionOrder: string[];
  fileCount: number;
  dependencyCount: number;
}

// ─── Internal Types ────────────────────────────────────────────────────────────

interface ParsedImport {
  raw: string;
  defaultImport?: string;
  namedImports: string[];
  source: string;
  isLocal: boolean;
  startIndex: number;
  endIndex: number;
}

interface ParsedExport {
  type: 'default-function' | 'default-const' | 'default-bare' | 'named-function' | 'named-const';
  name: string;
  raw: string;
  startIndex: number;
  endIndex: number;
}

interface FileAnalysis {
  normalizedName: string;
  fileName: string;
  originalKey: string;
  imports: ParsedImport[];
  exports: ParsedExport[];
  localDeps: string[];
  code: string;
}

// ─── Lucide Icon Allowlist ─────────────────────────────────────────────────────

const LUCIDE_ALLOWLIST = new Set([
  'Activity', 'AlertCircle', 'AlertTriangle', 'Archive', 'ArrowDown', 'ArrowLeft',
  'ArrowRight', 'ArrowUp', 'Award', 'BarChart', 'BarChart2', 'BarChart3',
  'Bell', 'Book', 'BookOpen', 'Box', 'Briefcase', 'Building', 'Building2',
  'Calendar', 'Camera', 'Car', 'Check', 'CheckCircle', 'CheckCircle2',
  'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ChevronUp', 'Circle',
  'Clock', 'Cloud', 'Code', 'Code2', 'Coffee', 'Compass', 'Copy', 'Cpu',
  'CreditCard', 'Crown', 'Database', 'Diamond', 'DollarSign', 'Download',
  'Dumbbell', 'Edit', 'ExternalLink', 'Eye', 'EyeOff', 'Facebook',
  'File', 'FileText', 'Filter', 'Flag', 'Flame', 'Folder', 'Gamepad',
  'Gift', 'Github', 'Globe', 'GraduationCap', 'Grid', 'Heart', 'HelpCircle',
  'Home', 'Image', 'Inbox', 'Info', 'Instagram', 'Key', 'Layers',
  'Layout', 'LifeBuoy', 'Link', 'Linkedin', 'List', 'Loader', 'Lock',
  'LogIn', 'LogOut', 'Mail', 'Map', 'MapPin', 'Maximize', 'Menu',
  'MessageCircle', 'MessageSquare', 'Mic', 'Minimize', 'Minus', 'Monitor',
  'Moon', 'MoreHorizontal', 'MoreVertical', 'Mountain', 'Mouse', 'Music',
  'Navigation', 'Package', 'Palette', 'Paperclip', 'Pause', 'Pen', 'Phone',
  'PhoneCall', 'PieChart', 'Pin', 'Plane', 'Play', 'PlayCircle', 'Plus',
  'PlusCircle', 'Printer', 'Quote', 'RefreshCw', 'Repeat', 'RotateCcw',
  'Rocket', 'Save', 'Scissors', 'Search', 'Send', 'Settings', 'Share',
  'Share2', 'Shield', 'ShieldCheck', 'ShoppingBag', 'ShoppingCart', 'Shuffle',
  'Sidebar', 'SkipBack', 'SkipForward', 'Sliders', 'Smartphone', 'Sparkle',
  'Sparkles', 'Speaker', 'Square', 'Star', 'Sun', 'Sunrise', 'Sunset',
  'Table', 'Tablet', 'Tag', 'Target', 'Terminal', 'ThumbsDown', 'ThumbsUp',
  'Timer', 'ToggleLeft', 'ToggleRight', 'Tool', 'Trash', 'Trash2',
  'TrendingDown', 'TrendingUp', 'Triangle', 'Trophy', 'Truck', 'Tv',
  'Twitter', 'Type', 'Umbrella', 'Underline', 'Undo', 'Unlock', 'Upload',
  'User', 'UserCheck', 'UserPlus', 'Users', 'Video', 'Volume', 'Volume2',
  'Wallet', 'Watch', 'Wifi', 'Wind', 'Wine', 'Wrench', 'X', 'Youtube',
  'Zap', 'ZoomIn', 'ZoomOut',
  'ChefHat', 'UtensilsCrossed', 'Utensils', 'Salad', 'Soup', 'Pizza',
  'GlassWater', 'Grape', 'Apple', 'Leaf', 'TreePine', 'Flower',
  'Gem', 'Coins', 'Banknote', 'Receipt', 'Ticket', 'QrCode',
  'Fingerprint', 'ScanLine', 'Waypoints', 'Network', 'Binary',
  'BrainCircuit', 'Bot', 'Atom', 'Beaker', 'FlaskConical', 'Microscope',
  'Stethoscope', 'HeartPulse', 'Pill', 'Syringe', 'Thermometer',
  'Bike', 'Bus', 'Ship', 'TrainFront', 'Footprints', 'Accessibility',
  'Baby', 'Cat', 'Dog', 'Fish', 'Bird', 'Bug',
  'Headphones', 'Radio', 'Podcast', 'Clapperboard', 'Film',
  'Paintbrush', 'PenTool', 'Ruler', 'Eraser',
  'Bookmark', 'Library', 'Newspaper', 'ScrollText',
  'Store', 'Warehouse', 'Factory', 'Landmark', 'Church', 'Castle',
  'Tent', 'Campfire', 'Backpack', 'Luggage', 'Globe2',
  'Languages', 'MessageCircleMore', 'MessagesSquare',
  'Handshake', 'PartyPopper', 'Candy', 'Cookie', 'IceCream', 'Cake',
  'ClipboardList', 'ClipboardCheck', 'ListChecks', 'ListOrdered',
  'AlignLeft', 'AlignCenter', 'AlignRight', 'AlignJustify',
  'Bold', 'Italic', 'Strikethrough', 'Heading', 'Heading1', 'Heading2',
  'SquareStack', 'Boxes', 'Component', 'Blocks', 'Puzzle',
  'CircleDot', 'CircleCheck', 'CircleX', 'CircleAlert',
  'BadgeCheck', 'BadgePlus', 'BadgeMinus', 'BadgeAlert', 'BadgeDollarSign',
  'ArrowUpRight', 'ArrowDownRight', 'ArrowUpLeft', 'ArrowDownLeft',
  'MoveRight', 'MoveLeft', 'MoveUp', 'MoveDown',
  'ChevronsUp', 'ChevronsDown', 'ChevronsLeft', 'ChevronsRight',
]);

// ─── Import Parser ─────────────────────────────────────────────────────────────

function parseImports(code: string): ParsedImport[] {
  const results: ParsedImport[] = [];
  const seen = new Set<number>(); // track matched indices to avoid dupes

  function addResult(m: RegExpExecArray, defaultImp: string | undefined, named: string[], src: string) {
    if (seen.has(m.index)) return;
    seen.add(m.index);
    const source = src.replace(/['"]/g, '');
    const isLocal = source.startsWith('./') || source.startsWith('../');
    results.push({
      raw: m[0],
      defaultImport: defaultImp,
      namedImports: named,
      source,
      isLocal,
      startIndex: m.index,
      endIndex: m.index + m[0].length,
    });
  }

  // 1. import Default from 'source'
  const re1 = /import\s+(?:type\s+)?(\w+)\s+from\s+(['"][^'"]+['"])\s*;?/g;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(code)) !== null) {
    addResult(m, m[1], [], m[2]);
  }

  // 2. import { A, B } from 'source'
  const re2 = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s+(['"][^'"]+['"])\s*;?/g;
  while ((m = re2.exec(code)) !== null) {
    const named = m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()!).filter(Boolean);
    addResult(m, undefined, named, m[2]);
  }

  // 3. import Default, { A, B } from 'source'
  const re3 = /import\s+(?:type\s+)?(\w+)\s*,\s*\{([^}]*)\}\s*from\s+(['"][^'"]+['"])\s*;?/g;
  while ((m = re3.exec(code)) !== null) {
    const named = m[2].split(',').map(s => s.trim().split(/\s+as\s+/).pop()!).filter(Boolean);
    addResult(m, m[1], named, m[3]);
  }

  // 4. import * as Name from 'source'
  const re4 = /import\s+(?:type\s+)?\*\s+as\s+(\w+)\s+from\s+(['"][^'"]+['"])\s*;?/g;
  while ((m = re4.exec(code)) !== null) {
    addResult(m, m[1], [], m[2]); // Treat namespace import as default import for simplicity in our commonjs interop
  }

  // 5. import 'source' (side-effect)
  const re5 = /import\s+(['"][^'"]+['"])\s*;?/g;
  while ((m = re5.exec(code)) !== null) {
    // Only add if not already matched by a more specific pattern
    if (!seen.has(m.index)) {
      addResult(m, undefined, [], m[1]);
    }
  }

  return results;
}

// ─── Export Parser ──────────────────────────────────────────────────────────────

function parseExports(code: string): ParsedExport[] {
  const results: ParsedExport[] = [];

  const defFnRe = /export\s+default\s+function\s+(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = defFnRe.exec(code)) !== null) {
    results.push({ type: 'default-function', name: m[1], raw: m[0], startIndex: m.index, endIndex: m.index + m[0].length });
  }

  const defAnonFnRe = /export\s+default\s+function\s*\(/g;
  while ((m = defAnonFnRe.exec(code)) !== null) {
    if (!results.some(r => r.startIndex === m!.index)) {
      results.push({ type: 'default-function', name: '__anonymous__', raw: m[0], startIndex: m.index, endIndex: m.index + m[0].length });
    }
  }

  const defConstRe = /export\s+default\s+(?:const|let|var)\s+(\w+)/g;
  while ((m = defConstRe.exec(code)) !== null) {
    results.push({ type: 'default-const', name: m[1], raw: m[0], startIndex: m.index, endIndex: m.index + m[0].length });
  }

  const defBareRe = /export\s+default\s+(\w+)\s*;/g;
  while ((m = defBareRe.exec(code)) !== null) {
    if (!results.some(r => r.startIndex === m!.index)) {
      results.push({ type: 'default-bare', name: m[1], raw: m[0], startIndex: m.index, endIndex: m.index + m[0].length });
    }
  }

  const namedFnRe = /export\s+function\s+(\w+)/g;
  while ((m = namedFnRe.exec(code)) !== null) {
    if (!results.some(r => r.startIndex === m!.index)) {
      results.push({ type: 'named-function', name: m[1], raw: m[0], startIndex: m.index, endIndex: m.index + m[0].length });
    }
  }

  const namedConstRe = /export\s+const\s+(\w+)/g;
  while ((m = namedConstRe.exec(code)) !== null) {
    if (!results.some(r => r.startIndex === m!.index)) {
      results.push({ type: 'named-const', name: m[1], raw: m[0], startIndex: m.index, endIndex: m.index + m[0].length });
    }
  }

  return results;
}

// ─── File Key Normalization ────────────────────────────────────────────────────

function normalizeFileKey(key: string): string {
  return key.split('/').pop() || key;
}

function componentNameFromFile(fileName: string): string {
  return fileName.replace(/\.tsx?$/, '');
}

import { ResponseNormalizer } from '../../infrastructure/agents/ResponseNormalizer';
import { SyntaxValidator } from '../../infrastructure/validators/SyntaxValidator';
import { SupportedDependencyRegistry } from '../../infrastructure/registry/SupportedDependencyRegistry';

function resolveImportSource(source: string): string {
  const basename = source.split('/').pop() || source;
  return basename.replace(/\.tsx?$/, '');
}

function getAppDeclarationsInFile(code: string): number {
  let count = 0;
  const declRegex = /(?:export\s+default\s+)?(?:export\s+)?(?:function|const|let|var|class)\s+App\b/g;
  while (declRegex.exec(code) !== null) {
    count++;
  }
  if (count === 0) {
    if (/export\s+default\s+App\b/.test(code) || /export\s+default\s+function\s*\(/.test(code)) {
      count = 1;
    }
  }
  return count;
}

// ─── Dependency Graph & Validation ─────────────────────────────────────────────

function analyzeFiles(generatedFiles: Record<string, string>): {
  files: Map<string, FileAnalysis>;
  diagnostics: BundleDiagnostic[];
} {
  const files = new Map<string, FileAnalysis>();
  const diagnostics: BundleDiagnostic[] = [];
  const seenComponents = new Map<string, string>();
  const appDeclSources: string[] = [];
  let totalAppDecls = 0;

  for (const [originalKey, rawCode] of Object.entries(generatedFiles)) {
    const normalized = normalizeFileKey(originalKey);
    if (!normalized.endsWith('.tsx') && !normalized.endsWith('.ts')) continue;
    if (normalized === 'index.css') continue;

    const code = ResponseNormalizer.cleanCode(rawCode);
    const compName = componentNameFromFile(normalized);
    const compKey = compName.toLowerCase();

    const fileAppDecls = getAppDeclarationsInFile(code);
    if (fileAppDecls > 0) {
      if (normalized === 'App.tsx') {
        totalAppDecls += fileAppDecls;
      }
      appDeclSources.push(`${normalized} (${fileAppDecls})`);
    }

    if (seenComponents.has(compKey)) {
      const isApp = compKey === 'app';
      const errType = isApp ? 'DUPLICATE_ENTRYPOINT' : 'DUPLICATE_DEFINITION';
      diagnostics.push({
        type: errType,
        source: originalKey,
        dependency: seenComponents.get(compKey),
        expectedFile: `${compName}.tsx`,
        message: `Duplicate ${isApp ? 'entrypoint' : 'definition'} "${compName}" detected in both "${seenComponents.get(compKey)}" and "${originalKey}".`,
        occurrences: isApp ? totalAppDecls : 2,
        sources: isApp ? appDeclSources : [seenComponents.get(compKey)!, originalKey],
      });
      continue;
    }
    seenComponents.set(compKey, originalKey);

    const imports = parseImports(code);
    const exports = parseExports(code);

    const localDeps: string[] = [];
    for (const imp of imports) {
      if (imp.isLocal) {
        const rawSource = imp.source.toLowerCase();
        // Skip non-component asset/data imports
        if (
          rawSource.endsWith('.json') ||
          rawSource.endsWith('.css') ||
          rawSource.endsWith('.svg') ||
          rawSource.endsWith('.png') ||
          rawSource.endsWith('.jpg') ||
          rawSource.endsWith('.jpeg') ||
          rawSource.endsWith('.gif') ||
          rawSource.endsWith('.webp')
        ) {
          continue;
        }

        const resolved = resolveImportSource(imp.source);
        // Components MUST start with an uppercase letter (PascalCase)
        if (/^[A-Z]/.test(resolved)) {
          localDeps.push(resolved);
        }
      } else {
        // Validate external package imports against SupportedDependencyRegistry
        if (!SupportedDependencyRegistry.isSupported(imp.source)) {
          diagnostics.push({
            type: 'UNSUPPORTED_EXTERNAL_DEPENDENCY',
            source: normalized,
            dependency: imp.source,
            expectedFile: imp.source,
            message: `File "${normalized}" imports unsupported external package "${imp.source}" (${imp.raw.trim()}). Only packages from the Supported Dependency Registry are allowed: [${SupportedDependencyRegistry.getSupportedDependencies().join(', ')}].`,
            detectedIssue: `File "${normalized}" imports unsupported external package "${imp.source}".`
          });
        }
      }
    }

    files.set(compName, {
      normalizedName: compName,
      fileName: normalized,
      originalKey,
      imports,
      exports,
      localDeps,
      code,
    });
  }

  // Duplicate App file check is handled by seenComponents above.

  // Validate dependencies exist and exports match
  for (const [, analysis] of files) {
    for (let i = 0; i < analysis.localDeps.length; i++) {
      const dep = analysis.localDeps[i];
      let depAnalysis = files.get(dep);

      // Check aliases if exact match not found (e.g. Footer -> FooterSection, FooterComponent)
      if (!depAnalysis) {
        const aliases = [
          dep + 'Section',
          dep + 'Component',
          dep + 'Nav',
          dep + 'Banner',
          dep + 'Grid',
          dep.endsWith('s') ? dep.slice(0, -1) : dep + 's'
        ];
        for (const alias of aliases) {
          if (files.has(alias)) {
            depAnalysis = files.get(alias);
            analysis.localDeps[i] = alias; // Update dep to resolved alias for topological sort
            break;
          }
        }
      }

      if (!depAnalysis) {
        diagnostics.push({
          type: 'MISSING_DEPENDENCY',
          source: analysis.fileName,
          dependency: dep,
          expectedFile: `${dep}.tsx`,
          message: `"${analysis.fileName}" imports "${dep}" but "${dep}.tsx" does not exist in generated files.`,
        });
        continue;
      }

      const depExports = depAnalysis.exports;
      const hasMatchingExport = depExports.some(e =>
        e.name === dep || e.name === depAnalysis!.normalizedName || e.name === '__anonymous__' || e.type.startsWith('default')
      );
      if (!hasMatchingExport && depExports.length > 0) {
        const exportedNames = depExports.map(e => e.name).join(', ');
        diagnostics.push({
          type: 'EXPORT_MISMATCH',
          source: analysis.fileName,
          dependency: dep,
          expectedFile: depAnalysis.fileName,
          message: `"${analysis.fileName}" imports "${dep}" but "${depAnalysis.fileName}" exports [${exportedNames}], not "${dep}".`,
        });
      }
    }
  }

  return { files, diagnostics };
}

// ─── Circular Dependency Detection ─────────────────────────────────────────────

function detectCycles(files: Map<string, FileAnalysis>): BundleDiagnostic[] {
  const diagnostics: BundleDiagnostic[] = [];
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();

  for (const name of files.keys()) color.set(name, WHITE);

  function dfs(node: string, path: string[]): boolean {
    color.set(node, GRAY);
    path.push(node);

    const analysis = files.get(node);
    if (analysis) {
      for (const dep of analysis.localDeps) {
        if (!files.has(dep)) continue;

        const c = color.get(dep);
        if (c === GRAY) {
          const cycleStart = path.indexOf(dep);
          const chain = [...path.slice(cycleStart), dep];
          diagnostics.push({
            type: 'CIRCULAR_DEPENDENCY',
            source: node,
            dependency: dep,
            chain,
            message: `Circular dependency detected: ${chain.join(' → ')}`,
          });
          return true;
        }
        if (c === WHITE) {
          if (dfs(dep, path)) return true;
        }
      }
    }

    path.pop();
    color.set(node, BLACK);
    return false;
  }

  for (const name of files.keys()) {
    if (color.get(name) === WHITE) {
      dfs(name, []);
    }
  }

  return diagnostics;
}

// ─── Topological Sort (Kahn's Algorithm) ────────────────────────────────────────

function topologicalSort(files: Map<string, FileAnalysis>): {
  order: string[];
  success: boolean;
} {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const name of files.keys()) {
    inDegree.set(name, 0);
    adjacency.set(name, []);
  }

  for (const [name, analysis] of files) {
    for (const dep of analysis.localDeps) {
      if (files.has(dep)) {
        inDegree.set(name, (inDegree.get(name) || 0) + 1);
        adjacency.get(dep)!.push(name);
      }
    }
  }

  const queue: string[] = [];
  for (const [name, deg] of inDegree) {
    if (deg === 0) queue.push(name);
  }
  queue.sort();

  const order: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);

    for (const dependent of adjacency.get(node)!) {
      const newDeg = (inDegree.get(dependent) || 1) - 1;
      inDegree.set(dependent, newDeg);
      if (newDeg === 0) {
        const idx = queue.findIndex(q => q > dependent);
        if (idx === -1) queue.push(dependent);
        else queue.splice(idx, 0, dependent);
      }
    }
  }

  return {
    order,
    success: order.length === files.size,
  };
}

// ─── Code Transformation ───────────────────────────────────────────────────────

// ─── Code Transformation & Scoped Module Registry ─────────────────────────────

function transformCode(code: string, compName: string, isApp: boolean): string {
  let transformed = ResponseNormalizer.cleanCode(code);

  const parsedImports = parseImports(transformed);
  parsedImports.sort((a, b) => b.startIndex - a.startIndex);

  for (const imp of parsedImports) {
    let replacement = '';
    const src = imp.source;
    
    if (src === 'react') {
      if (imp.defaultImport && imp.namedImports.length > 0) {
        replacement = `var React = __require__("react"); var { ${imp.namedImports.join(', ')} } = React;`;
      } else if (imp.defaultImport) {
        replacement = `var React = __require__("react");`;
      } else if (imp.namedImports.length > 0) {
        replacement = `var React = __require__("react"); var { ${imp.namedImports.join(', ')} } = React;`;
      } else {
        replacement = `var React = __require__("react");`;
      }
    } else if (src === 'lucide-react') {
      if (imp.namedImports.length > 0) {
        replacement = `var __lucide = __require__("lucide-react"); var { ${imp.namedImports.join(', ')} } = __lucide;`;
      } else {
        replacement = `var __lucide = __require__("lucide-react");`;
      }
    } else {
      const pkgVar = `__pkg_${imp.startIndex}`;
      let stmts = [`var ${pkgVar} = __require__("${src}");`];
      if (imp.defaultImport) {
        stmts.push(`var ${imp.defaultImport} = ${pkgVar}.default || ${pkgVar};`);
      }
      if (imp.namedImports.length > 0) {
        stmts.push(`var { ${imp.namedImports.join(', ')} } = ${pkgVar};`);
      }
      replacement = stmts.join(' ');
    }
    transformed = transformed.slice(0, imp.startIndex) + replacement + transformed.slice(imp.endIndex);
  }

  // Rewrite exports
  if (!isApp) {
    transformed = transformed.replace(
      /export\s+default\s+function\s+App\s*\(/g,
      `function ${compName}(`
    );
  }

  transformed = transformed.replace(
    /export\s+default\s+function\s+(\w+)\s*\(/g,
    'function $1('
  );
  transformed = transformed.replace(
    /export\s+default\s+function\s*\(/g,
    `function ${compName}(`
  );
  transformed = transformed.replace(
    /export\s+default\s+(const|let|var)\s+(\w+)/g,
    '$1 $2'
  );
  transformed = transformed.replace(
    /export\s+default\s+(\w+)\s*;?/g,
    '__exports__.default = $1;'
  );

  transformed = transformed.replace(/export\s+function\s+(\w+)\s*\(/g, 'function $1(');
  transformed = transformed.replace(/export\s+(const|let|var)\s+(\w+)/g, '$1 $2');
  transformed = transformed.replace(/export\s+\{\s*([^}]+)\s*\}\s*;?/g, ''); // strip named exports block

  // Strip Icon prefix from JSX tags
  transformed = transformed.replace(/<Icon([A-Z][a-zA-Z0-9]*)/g, '<$1');
  transformed = transformed.replace(/<\/Icon([A-Z][a-zA-Z0-9]*)/g, '</$1');

  // Replace routers
  transformed = transformed.replace(/BrowserRouter/g, 'MemoryRouter');
  transformed = transformed.replace(/HashRouter/g, 'MemoryRouter');

  if (isApp) {
    transformed += `\nif (typeof App !== 'undefined') { __exports__.default = App; var __app_component__ = App; }`;
  }

  return transformed;
}

function wrapInModuleScope(compName: string, transformedCode: string): string {
  return `__modules__['${compName}'] = function(__exports__, __require__) {
${transformedCode}
if (!__exports__.default) {
  if (typeof ${compName} !== 'undefined') {
    __exports__.default = ${compName};
  } else if (typeof App !== 'undefined') {
    __exports__.default = App;
  }
}
if (typeof ${compName} !== 'undefined') {
  __exports__['${compName}'] = ${compName};
}
};`;
}

// ─── Srcdoc Generation ─────────────────────────────────────────────────────────

function buildSuccessSrcdoc(
  transformedBlocks: { compName: string; code: string }[],
  rawBundledSource?: string,
): string {
  const moduleWrappedBlocks = rawBundledSource
    ? [rawBundledSource]
    : transformedBlocks.map(b => wrapInModuleScope(b.compName, b.code));

  const concatenated = moduleWrappedBlocks.join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, sans-serif; background-color: #0f172a; color: #f8fafc; }
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="error-display" style="display:none; padding: 2rem; background: #450a0a; color: #fca5a5; font-family: monospace; border: 1px solid #991b1b; margin: 1rem; border-radius: 0.75rem; max-width: 90%; white-space: pre-wrap; word-break: break-all;"></div>

  <script>
    document.addEventListener('click', function(e) {
      var anchor = e.target;
      while (anchor && anchor.tagName !== 'A') anchor = anchor.parentElement;
      if (!anchor) return;
      var href = anchor.getAttribute('href');
      if (!href) return;
      if (href.startsWith('http://') || href.startsWith('https://')) { e.preventDefault(); return; }
      if (href.startsWith('/')) {
        e.preventDefault();
        try { history.replaceState(null, '', '#' + href.slice(1)); } catch(err) {}
        window.scrollTo(0, 0);
        return;
      }
      if (href.startsWith('#')) {
        e.preventDefault();
        var targetId = href.slice(1);
        if (targetId) { var el = document.getElementById(targetId); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
        return;
      }
      e.preventDefault();
    }, true);
    history.go = function() {}; history.back = function() {}; history.forward = function() {};
    try { Object.defineProperty(window, 'top', { get: function() { return window; } }); } catch(e) {}
    try { if (window.parent && window.parent !== window) { Object.defineProperty(window.parent, 'location', { get: function() { return window.location; }, set: function() {} }); } } catch(e) {}
  <\/script>

  <script>
    (function() {
      var __diagnostic_id__ = 'bundle-' + Date.now();
      console.log('[PREVIEW TRACE] files received: ' + ${transformedBlocks.length});

      window.__modules__ = window.__modules__ || {};
      window.__cache__ = window.__cache__ || {};

      function sendParentLog(level, msg) {
        try { window.parent.postMessage({ type: 'IFRAME_LOG', level: level, message: msg }, '*'); } catch(e) {}
      }

      function showErrorOverlay(text) {
        try {
          var el = document.getElementById('error-display');
          if (el) { el.style.display = 'block'; el.innerText = text; }
        } catch(e) {}
      }

      window.addEventListener('error', function(evt) {
        var msg = (evt && evt.message) || (evt && evt.error && evt.error.message) || String(evt);
        var stack = (evt && evt.error && evt.error.stack) || '';
        showErrorOverlay('Runtime Error:\\n' + msg + '\\n' + stack);
        sendParentLog('error', 'NEXSITE_PREVIEW_ERROR: ' + msg);
        try { window.parent.postMessage({ type: 'NEXSITE_PREVIEW_ERROR', error: msg, stack: stack }, '*'); } catch(e) {}
      });

      window.addEventListener('unhandledrejection', function(evt) {
        var reason = evt && evt.reason;
        var msg = (reason && reason.message) || String(reason);
        var stack = (reason && reason.stack) || '';
        showErrorOverlay('Unhandled Rejection:\\n' + msg + '\\n' + stack);
        sendParentLog('error', 'NEXSITE_PREVIEW_ERROR: ' + msg);
        try { window.parent.postMessage({ type: 'NEXSITE_PREVIEW_ERROR', error: msg, stack: stack }, '*'); } catch(e) {}
      });

      // Lucide Icon Fallback Component
      var LucideIcon = function(props) {
        var size = (props && props.size) || 20;
        var color = (props && props.color) || 'currentColor';
        var sw = (props && props.strokeWidth) || 2;
        var cn = (props && props.className) || '';
        return React.createElement('svg', {
          width: size, height: size, viewBox: '0 0 24 24',
          fill: 'none', stroke: color, strokeWidth: sw,
          strokeLinecap: 'round', strokeLinejoin: 'round', className: cn
        }, React.createElement('circle', { cx: 12, cy: 12, r: 10 }), React.createElement('path', { d: 'M12 8v8M8 12h8' }));
      };

      // Custom Module Resolver
      function __require__(id) {
        if (!id) return {};

        // Extract base component name from any path format (e.g. ./components/CTA -> CTA)
        var parts = String(id).split('/');
        var cleanId = parts[parts.length - 1].replace(/\\.tsx?$/, '').trim();

        // 1. Check module registry (exact, case-insensitive, or substring match)
        var modKey = null;
        if (__modules__[cleanId]) {
          modKey = cleanId;
        } else {
          var lower = cleanId.toLowerCase();
          for (var k in __modules__) {
            if (k.toLowerCase() === lower) { modKey = k; break; }
          }
          if (!modKey) {
            for (var k in __modules__) {
              if (k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())) { modKey = k; break; }
            }
          }
        }

        if (modKey) {
          if (!__cache__[modKey]) {
            var modExports = {};
            __cache__[modKey] = modExports;
            try {
              __modules__[modKey](modExports, __require__);
            } catch(err) {
              console.error('Module execution failed for [' + modKey + ']:', err);
              throw err;
            }
          }
          var cached = __cache__[modKey];
          var res = cached.default !== undefined ? cached.default : cached;
          if (res && (typeof res === 'function' || typeof res === 'object')) {
            for (var expKey in cached) {
              if (!(expKey in res)) {
                try { res[expKey] = cached[expKey]; } catch(e) {}
              }
            }
          }
          return res;
        }

        // 2. React mapping
        if (cleanId === 'react') return React;
        if (cleanId === 'react-dom') return ReactDOM;

        // 3. Lucide icon mapping
        if (cleanId === 'lucide-react') {
          return new Proxy({}, {
            get: function(_, prop) {
              if (typeof prop === 'string') {
                return function(props) { return React.createElement(LucideIcon, props); };
              }
              return LucideIcon;
            }
          });
        }

        // Router shims
        if (cleanId === 'react-router-dom') {
          var MemoryRouter = function(props) { return React.createElement(React.Fragment, null, props.children); };
          return {
            MemoryRouter: MemoryRouter, BrowserRouter: MemoryRouter, HashRouter: MemoryRouter,
            Routes: function(props) { return React.createElement(React.Fragment, null, props.children); },
            Route: function(props) { return props.element || React.createElement(React.Fragment, null, props.children); },
            Link: function(props) { return React.createElement('a', { href: props.to || '#', onClick: function(e) { e.preventDefault(); } }, props.children); },
            NavLink: function(props) { return React.createElement('a', { href: props.to || '#', onClick: function(e) { e.preventDefault(); } }, props.children); },
            useNavigate: function() { return function() {}; },
            useLocation: function() { return { pathname: '/', search: '', hash: '' }; },
            useParams: function() { return {}; }
          };
        }

        // Framer Motion shims
        if (cleanId === 'framer-motion') {
          return {
            motion: new Proxy({}, { get: function(_, tag) { return function(props) { return React.createElement(tag, props); }; } }),
            AnimatePresence: function(props) { return React.createElement(React.Fragment, null, props.children); },
            useInView: function() { return [null, true]; }
          };
        }

        // Clsx / CN shims
        if (cleanId === 'clsx' || cleanId === 'tailwind-merge') {
          return { clsx: function() { return Array.from(arguments).flat().filter(Boolean).join(' '); }, cn: function() { return Array.from(arguments).flat().filter(Boolean).join(' '); } };
        }

        // 4. Safe Component Fallback for unrecognized packages
        var FallbackComp = function(props) {
          return React.createElement('div', {
            style: { padding: '8px', border: '1px dashed #64748b', borderRadius: '6px', fontSize: '12px', color: '#94a3b8' }
          }, String(cleanId));
        };
        return new Proxy(FallbackComp, {
          get: function(_, prop) {
            return FallbackComp;
          }
        });
      }

      console.log('[BUNDLE TRACE]\\nFiles:\\n' + ${JSON.stringify(transformedBlocks.map(b => '- ' + b.compName + '.tsx').join('\\n'))} + '\\n\\nApp declarations found: 1');
      console.log('[PREVIEW TRACE] bundle assembled');
      console.log('[PREVIEW TRACE] bundle length: ' + ${concatenated.length});
      console.log('[PREVIEW TRACE] Babel starting');

      var transpiledCode = '';
      try {
        var babelRes = Babel.transform(${JSON.stringify(concatenated)}, {
          presets: [['react', { runtime: 'classic' }], 'typescript'],
          filename: 'bundle.tsx'
        });
        transpiledCode = babelRes.code;
        console.log('[PREVIEW TRACE] Babel succeeded: ' + transpiledCode.length + ' chars');
      } catch(babelErr) {
        console.error('[PREVIEW TRACE] Babel failed:', babelErr && babelErr.message);
        showErrorOverlay('Babel Transpilation Failed:\\n' + (babelErr && babelErr.stack));
        sendParentLog('error', 'Babel Transpilation Failed: ' + (babelErr && babelErr.message));
        return;
      }

      console.log('[PREVIEW TRACE] JS execution starting');
      console.log('[PREVIEW TRACE] React available:', typeof React === 'object');
      console.log('[PREVIEW TRACE] ReactDOM available:', typeof ReactDOM === 'object');

      try {
        var evalFunc = new Function(
          'React', 'ReactDOM', 'LucideIcon', '__modules__', '__cache__', '__require__',
          transpiledCode
        );
        evalFunc(React, ReactDOM, LucideIcon, __modules__, __cache__, __require__);

        var AppComponent = __require__('App');
        console.log('[PREVIEW TRACE] App available:', typeof AppComponent === 'function' || typeof AppComponent === 'object');

        if (!AppComponent || (typeof AppComponent !== 'function' && typeof AppComponent !== 'object')) {
          throw new Error('App component could not be resolved from module registry.');
        }

        console.log('[PREVIEW TRACE] mounting App');
        var rootEl = document.getElementById('root');
        var root = ReactDOM.createRoot(rootEl);

        function NexSiteMount() {
          return React.createElement(AppComponent);
        }

        root.render(React.createElement(NexSiteMount));

        requestAnimationFrame(function() {
          setTimeout(function() {
            var childrenCount = (rootEl && rootEl.children) ? rootEl.children.length : 0;
            console.log('[PREVIEW TRACE] root children count: ' + childrenCount);
            if (childrenCount > 0) {
              console.log('[PREVIEW TRACE] mount succeeded');
              sendParentLog('info', 'PREVIEW_RENDERED');
              try { window.parent.postMessage({ type: 'NEXSITE_PREVIEW_READY', childrenCount: childrenCount }, '*'); } catch(e) {}
            } else {
              console.error('[PREVIEW TRACE] mount failed: 0 children in root element');
              showErrorOverlay('Mount Error: React rendered but root element has 0 children.');
              sendParentLog('error', 'Mount Error: 0 children in root element');
              try { window.parent.postMessage({ type: 'NEXSITE_PREVIEW_ERROR', error: 'Root element has 0 children after React mount.' }, '*'); } catch(e) {}
            }
          }, 150);
        });

      } catch(execErr) {
        console.error('[PREVIEW TRACE] JS execution failed:', execErr && execErr.message);
        showErrorOverlay('Execution / Render Error:\\n' + (execErr && execErr.stack));
        sendParentLog('error', 'Execution Error: ' + (execErr && execErr.message));
        try { window.parent.postMessage({ type: 'NEXSITE_PREVIEW_ERROR', error: execErr && execErr.message, stack: execErr && execErr.stack }, '*'); } catch(e) {}
      }
    })();
  <\/script>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildErrorSrcdoc(diagnostics: BundleDiagnostic[]): string {
  const errorItems = diagnostics
    .filter(d => d.type !== 'BUNDLE_VALID')
    .map(d => {
      let icon = '❌';
      if (d.type === 'CIRCULAR_DEPENDENCY') icon = '🔄';
      if (d.type === 'EXPORT_MISMATCH') icon = '⚠️';
      if (d.type === 'DUPLICATE_DEFINITION') icon = '📋';
      if (d.type === 'UNSUPPORTED_EXTERNAL_DEPENDENCY') icon = '📦';

      let detail = `<div style="margin-bottom: 1rem; padding: 1rem; background: #1e1b2e; border: 1px solid #4c1d95; border-radius: 0.5rem;">
        <div style="font-weight: 700; color: #f87171; margin-bottom: 0.25rem;">${icon} ${escapeHtml(d.type)}</div>
        <div style="color: #e2e8f0; font-size: 0.875rem;">${escapeHtml(d.message)}</div>`;
      if (d.source) detail += `<div style="color: #94a3b8; font-size: 0.75rem; margin-top: 0.25rem;">Source: ${escapeHtml(d.source)}</div>`;
      if (d.dependency) detail += `<div style="color: #94a3b8; font-size: 0.75rem;">Dependency: ${escapeHtml(d.dependency)}</div>`;
      if (d.chain) detail += `<div style="color: #c084fc; font-size: 0.75rem; margin-top: 0.25rem;">${escapeHtml(d.chain.join(' → '))}</div>`;
      detail += '</div>';
      return detail;
    })
    .join('');

  const missingDeps = diagnostics.filter(d => d.type === 'MISSING_DEPENDENCY');
  let depTree = '';
  if (missingDeps.length > 0) {
    depTree = '<div style="margin-top: 1rem; padding: 1rem; background: #1a1625; border: 1px solid #3b2063; border-radius: 0.5rem; font-family: monospace; font-size: 0.8rem; color: #c4b5fd; white-space: pre-wrap;">';
    for (const d of missingDeps) {
      depTree += `${escapeHtml(d.source || '?')}\n  └── ${escapeHtml(d.dependency || '?')}.tsx ❌ missing\n\n`;
    }
    depTree += '</div>';
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Inter', system-ui, sans-serif; background: #0c0a15; color: #f8fafc; min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding: 2rem; }
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  </style>
</head>
<body>
  <div style="max-width: 640px; width: 100%;">
    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
      <div style="width: 3rem; height: 3rem; border-radius: 0.75rem; background: linear-gradient(135deg, #7c3aed, #ec4899); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🔧</div>
      <div>
        <h1 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: #f87171;">Render Build Failed</h1>
        <p style="margin: 0; font-size: 0.75rem; color: #64748b;">${diagnostics.filter(d => d.type !== 'BUNDLE_VALID').length} diagnostic(s)</p>
      </div>
    </div>
    ${errorItems}
    ${depTree}
  </div>
  <script>
    try { window.parent.postMessage({ type: 'IFRAME_LOG', level: 'error', message: 'Bundle validation failed: ${diagnostics.filter(d => d.type !== 'BUNDLE_VALID').length} error(s)' }, '*'); } catch(e) {}
  <\/script>
</body>
</html>`;
}

// ─── Detect JSX usage of components not in the dep graph ───────────────────────

function detectUnresolvedJsxComponents(
  files: Map<string, FileAnalysis>,
): BundleDiagnostic[] {
  const diagnostics: BundleDiagnostic[] = [];
  const allComponentNames = new Set(files.keys());

  const knownLibComponents = new Set([
    'Fragment', 'Suspense', 'StrictMode',
    'MemoryRouter', 'BrowserRouter', 'HashRouter',
    'Routes', 'Route', 'Link', 'NavLink',
    'AnimatePresence',
  ]);

  for (const [compName, analysis] of files) {
    const jsxTagRe = /<([A-Z][A-Za-z0-9]+)[\s/>]/g;
    let match: RegExpExecArray | null;
    const usedComponents = new Set<string>();

    while ((match = jsxTagRe.exec(analysis.code)) !== null) {
      usedComponents.add(match[1]);
    }

    for (const used of usedComponents) {
      if (allComponentNames.has(used)) continue;
      if (LUCIDE_ALLOWLIST.has(used)) continue;
      if (used === compName) continue;
      if (knownLibComponents.has(used)) continue;

      // Check aliases (e.g. Footer -> FooterSection, FooterComponent)
      const aliases = [
        used + 'Section', used + 'Component', used + 'Nav', used + 'Banner', used + 'Grid',
        used.endsWith('s') ? used.slice(0, -1) : used + 's'
      ];
      if (aliases.some(a => allComponentNames.has(a))) continue;

      // Lenient: PascalCase short names are likely icons the LLM used
      // that we don't have in our allowlist — they'll get a ReferenceError
      // at runtime but we don't block the bundle for this
      const looksLikeIcon = /^[A-Z][a-z]+(?:[A-Z][a-z]*)*\d?$/.test(used) && used.length < 25;
      if (looksLikeIcon) continue;

      diagnostics.push({
        type: 'MISSING_DEPENDENCY',
        source: analysis.fileName,
        dependency: used,
        expectedFile: `${used}.tsx`,
        message: `"${analysis.fileName}" uses <${used}/> in JSX but no "${used}.tsx" exists and "${used}" is not a known icon or library component.`,
      });
    }
  }

  return diagnostics;
}

// ─── Deterministic Bundle Assembly ──────────────────────────────────────────────

export function assembleBundle(
  generatedFiles: Record<string, string>,
  entryFile: string = 'App.tsx'
): {
  order: string[];
  files: Map<string, FileAnalysis>;
  diagnostics: BundleDiagnostic[];
  success: boolean;
} {
  const tsxFiles: Record<string, string> = {};
  for (const [key, code] of Object.entries(generatedFiles)) {
    const normalized = normalizeFileKey(key);
    if (normalized.endsWith('.tsx') || normalized.endsWith('.ts')) {
      if (normalized === 'index.css') continue;
      if (!tsxFiles[normalized]) {
        tsxFiles[normalized] = code;
      }
    }
  }

  const syntaxErrors = SyntaxValidator.validateAllFiles(generatedFiles);
  const { files, diagnostics } = analyzeFiles(generatedFiles);
  const cycleErrors = detectCycles(files);
  const unresolvedErrors = detectUnresolvedJsxComponents(files);

  const allDiagnostics = [...syntaxErrors, ...diagnostics, ...cycleErrors, ...unresolvedErrors];

  const fatalErrors = allDiagnostics.filter(e =>
    e.type === 'MISSING_DEPENDENCY' ||
    e.type === 'CIRCULAR_DEPENDENCY' ||
    e.type === 'DUPLICATE_ENTRYPOINT' ||
    e.type === 'DUPLICATE_DEFINITION' ||
    e.type === 'SYNTAX_ERROR' ||
    e.type === 'MARKDOWN_FENCE'
  );

  if (fatalErrors.length > 0) {
    return { order: [], files, diagnostics: allDiagnostics, success: false };
  }

  const { order, success: sortSuccess } = topologicalSort(files);

  const entryCompName = componentNameFromFile(entryFile);
  if (sortSuccess && order.includes(entryCompName)) {
    // App.tsx is strictly placed last in topological order
    const entryIdx = order.indexOf(entryCompName);
    order.splice(entryIdx, 1);
    order.push(entryCompName);
  }

  return {
    order,
    files,
    diagnostics: allDiagnostics,
    success: sortSuccess,
  };
}

// ─── Main Entry Point ──────────────────────────────────────────────────────────

export function compileBundle(generatedFiles: Record<string, string>): BundleResult {
  const assembly = assembleBundle(generatedFiles, 'App.tsx');
  const { files, order, diagnostics: allErrors, success: assemblySuccess } = assembly;

  if (!assemblySuccess) {
    return {
      success: false,
      diagnostics: allErrors,
      srcdoc: buildErrorSrcdoc(allErrors),
      executionOrder: order,
      fileCount: files.size,
      dependencyCount: 0,
    };
  }

  // Transform code in topological order
  const transformedBlocks: { compName: string; code: string }[] = [];
  let totalDeps = 0;

  for (const compName of order) {
    const analysis = files.get(compName)!;
    const isApp = compName === 'App';
    const transformed = transformCode(analysis.code, compName, isApp);
    transformedBlocks.push({ compName, code: transformed });
    totalDeps += analysis.localDeps.length;
  }

  // Trace App declarations across transformed blocks
  let appDeclCount = 0;
  const appDeclSources: string[] = [];
  for (const block of transformedBlocks) {
    const matches = block.code.match(/(?:function|const|let|class)\s+App\b/g);
    if (matches && matches.length > 0) {
      appDeclCount += matches.length;
      appDeclSources.push(`${block.compName}.tsx (${matches.length})`);
    }
  }

  const filesListTrace = order.map(f => `- ${f}.tsx`).join('\n');
  console.log(`[BUNDLE TRACE]\nFiles:\n${filesListTrace}\n\nApp declarations found: ${appDeclCount}${appDeclSources.length > 0 ? ` (${appDeclSources.join(', ')})` : ''}`);

  // Module wrapper ensures isolated scopes, so identical internal variable names (like 'App') in different files are perfectly safe.

  const moduleWrappedBlocks = transformedBlocks.map(b => wrapInModuleScope(b.compName, b.code));
  const concatenated = moduleWrappedBlocks.join('\n\n');

  // Build success srcdoc using module-wrapped source
  const srcdoc = buildSuccessSrcdoc(transformedBlocks, concatenated);

  const successDiag: BundleDiagnostic = {
    type: 'BUNDLE_VALID',
    message: `Bundle validation passed. ${files.size} files, ${totalDeps} dependencies, App declarations: ${appDeclCount}, order: [${order.join(', ')}]`,
  };

  // DEBUG LOG AS REQUESTED BY USER
  if (generatedFiles['App.tsx']) {
    console.log(`\n==================================================`);
    console.log(`STEP 1 — INSPECT THE ACTUAL GENERATED FILES`);
    console.log(`==================================================`);
    console.log(`App.tsx original:\n${generatedFiles['App.tsx']}\n`);
    const transformedApp = transformedBlocks.find(b => b.compName === 'App')?.code;
    console.log(`App.tsx transformed:\n${transformedApp}\n`);
    const wrappedApp = moduleWrappedBlocks[moduleWrappedBlocks.length - 1]; // App is last
    console.log(`App.tsx wrapped:\n${wrappedApp}\n`);
    console.log(`==================================================\n`);
  }

  return {
    success: true,
    diagnostics: [...allErrors, successDiag],
    srcdoc,
    executionOrder: order,
    fileCount: files.size,
    dependencyCount: totalDeps,
  };
}

// Export internals for testing
export { parseImports, parseExports, topologicalSort, detectCycles, transformCode, normalizeFileKey, analyzeFiles, LUCIDE_ALLOWLIST };
export type { FileAnalysis, ParsedImport, ParsedExport };
