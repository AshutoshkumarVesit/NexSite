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
          // Exclude self-dependency (e.g. Testimonials importing Testimonials) and deduplicate
          if (resolved !== compName && !localDeps.includes(resolved)) {
            localDeps.push(resolved);
          }
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

// ─── Circular Dependency Detection & Graph Auto-Healing ─────────────────────────

function detectCycles(files: Map<string, FileAnalysis>): BundleDiagnostic[] {
  const diagnostics: BundleDiagnostic[] = [];
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();

  for (const name of files.keys()) color.set(name, WHITE);

  function dfs(node: string, path: string[]) {
    color.set(node, GRAY);
    path.push(node);

    const analysis = files.get(node);
    if (analysis) {
      // Iterate over a snapshot of localDeps so we can safely break cycles
      const currentDeps = [...analysis.localDeps];
      for (const dep of currentDeps) {
        if (!files.has(dep)) continue;
        
        // Auto-remove self-dependencies
        if (dep === node) {
          analysis.localDeps = analysis.localDeps.filter(d => d !== dep);
          continue;
        }

        const c = color.get(dep);
        if (c === GRAY) {
          const cycleStart = path.indexOf(dep);
          const chain = [...path.slice(cycleStart), dep];
          console.warn(`[BundleCompiler] 🔄 Circular dependency detected & auto-broken: ${chain.join(' → ')}`);
          diagnostics.push({
            type: 'CIRCULAR_DEPENDENCY',
            source: node,
            dependency: dep,
            chain,
            message: `Circular dependency detected: ${chain.join(' → ')}`,
          });
          // Break cycle in dependency graph for Kahn's topological sort
          analysis.localDeps = analysis.localDeps.filter(d => d !== dep);
        } else if (c === WHITE) {
          dfs(dep, path);
        }
      }
    }

    path.pop();
    color.set(node, BLACK);
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

  // If any components remain un-enqueued (e.g. due to graph cycles), append them safely
  if (order.length < files.size) {
    for (const name of files.keys()) {
      if (!order.includes(name)) {
        order.push(name);
      }
    }
  }

  return {
    order,
    success: true,
  };
}

// ─── Code Transformation ───────────────────────────────────────────────────────

// ─── Code Transformation & Scoped Module Registry ─────────────────────────────

function transformCode(code: string, compName: string, _isApp?: boolean): string {
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
        stmts.push(`var ${imp.defaultImport} = (${pkgVar} && ${pkgVar}.default !== undefined) ? ${pkgVar}.default : ${pkgVar};`);
      }
      if (imp.namedImports.length > 0) {
        stmts.push(`var { ${imp.namedImports.join(', ')} } = ${pkgVar} || {};`);
      }
      replacement = stmts.join(' ');
    }
    transformed = transformed.slice(0, imp.startIndex) + replacement + transformed.slice(imp.endIndex);
  }

  // Rewrite exports
  // 1. export default function Name(...)
  transformed = transformed.replace(
    /export\s+default\s+(?:async\s+)?function\s+(\w+)\s*\(/g,
    'function $1('
  );

  // 2. export default function(...) -> anonymous function
  transformed = transformed.replace(
    /export\s+default\s+(?:async\s+)?function\s*\(/g,
    `function ${compName}(`
  );

  // 3. export default (const|let|var) Name = ...
  transformed = transformed.replace(
    /export\s+default\s+(const|let|var)\s+(\w+)/g,
    '$1 $2'
  );

  // 4. export default () => or export default (props) =>
  transformed = transformed.replace(
    /export\s+default\s+(?:async\s+)?(\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g,
    `const ${compName} = ($1) =>`
  );

  // 5. export default <expression>;
  transformed = transformed.replace(
    /export\s+default\s+([^;\n]+);?/g,
    '__exports__.default = $1;'
  );

  // 6. Named function exports
  transformed = transformed.replace(/export\s+(?:async\s+)?function\s+(\w+)\s*\(/g, 'function $1(');

  // 7. Named variable exports
  transformed = transformed.replace(/export\s+(const|let|var)\s+(\w+)/g, '$1 $2');

  // 8. Named export clauses: export { A, B as C, D as default };
  transformed = transformed.replace(/export\s*\{([^}]+)\}\s*;?/g, (_, clause) => {
    const parts = clause.split(',').map((s: string) => s.trim()).filter(Boolean);
    const assignStmts: string[] = [];
    for (const part of parts) {
      if (part.includes(' as ')) {
        const [orig, alias] = part.split(/\s+as\s+/).map((s: string) => s.trim());
        if (alias === 'default') {
          assignStmts.push(`__exports__.default = ${orig};`);
        } else {
          assignStmts.push(`__exports__['${alias}'] = ${orig};`);
        }
      } else {
        assignStmts.push(`__exports__['${part}'] = ${part};`);
      }
    }
    return assignStmts.join(' ');
  });

  // Strip Icon prefix from JSX tags: <IconShield /> -> <Shield />
  transformed = transformed.replace(/<Icon([A-Z][a-zA-Z0-9]*)/g, '<$1');
  transformed = transformed.replace(/<\/Icon([A-Z][a-zA-Z0-9]*)/g, '</$1');

  // Replace routers
  transformed = transformed.replace(/BrowserRouter/g, 'MemoryRouter');
  transformed = transformed.replace(/HashRouter/g, 'MemoryRouter');

  return transformed;
}

function wrapInModuleScope(compName: string, transformedCode: string, exportedNames: string[] = []): string {
  const safeNamesJson = JSON.stringify(exportedNames.filter(n => n && n !== '__anonymous__'));
  return `__modules__['${compName}'] = function(__exports__, __require__, module) {
var exports = __exports__;
var motion = window.motion || (__require__('framer-motion') && __require__('framer-motion').motion);
var AnimatePresence = window.AnimatePresence || (__require__('framer-motion') && __require__('framer-motion').AnimatePresence);
var useInView = window.useInView;
var useAnimation = window.useAnimation;
var useMotionValue = window.useMotionValue;
var useTransform = window.useTransform;
var useSpring = window.useSpring;
var useScroll = window.useScroll;
${transformedCode}

// Comprehensive export auto-binding
(function() {
  var knownNames = ${safeNamesJson};
  var candidates = [];

  for (var i = 0; i < knownNames.length; i++) {
    var kName = knownNames[i];
    try {
      var val = eval(kName);
      if (val !== undefined) {
        if (!__exports__[kName]) __exports__[kName] = val;
        candidates.push(val);
      }
    } catch(e) {}
  }

  try { if (typeof ${compName} !== 'undefined' && ${compName} !== undefined) { candidates.push(${compName}); if (!__exports__['${compName}']) __exports__['${compName}'] = ${compName}; } } catch(e) {}
  try { if (typeof App !== 'undefined' && App !== undefined) { candidates.push(App); if (!__exports__['App']) __exports__['App'] = App; } } catch(e) {}

  if (!__exports__.default) {
    if (module && module.exports && module.exports !== __exports__) {
      __exports__.default = (module.exports && module.exports.default !== undefined) ? module.exports.default : module.exports;
    } else if (candidates.length > 0) {
      __exports__.default = candidates[0];
    } else {
      for (var k in __exports__) {
        if (k !== 'default' && (typeof __exports__[k] === 'function' || (typeof __exports__[k] === 'object' && __exports__[k] !== null))) {
          __exports__.default = __exports__[k];
          break;
        }
      }
    }
  }

  if (!__exports__['${compName}'] && __exports__.default) {
    __exports__['${compName}'] = __exports__.default;
  }
  ${compName === 'App' ? `
  if (!__exports__['App'] && __exports__.default) {
    __exports__['App'] = __exports__.default;
  }
  ` : ''}
})();
};`;
}

// ─── Srcdoc Generation ─────────────────────────────────────────────────────────

function buildSuccessSrcdoc(
  transformedBlocks: { compName: string; code: string; exportedNames: string[] }[],
  rawBundledSource?: string,
): string {
  const moduleWrappedBlocks = rawBundledSource
    ? [rawBundledSource]
    : transformedBlocks.map(b => wrapInModuleScope(b.compName, b.code, b.exportedNames));

  const concatenated = moduleWrappedBlocks.join('\n\n');
  const lucideListJson = JSON.stringify(Array.from(LUCIDE_ALLOWLIST));

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
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, system-ui, -apple-system, sans-serif; background-color: #0f172a; color: #f8fafc; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    html { scroll-behavior: smooth; }
    :root {
      --primary: #7c3aed;
      --secondary: #6366f1;
      --accent: #ec4899;
      --bg: #0f172a;
      --surface: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: #334155;
    }
    img { max-width: 100%; height: auto; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(124, 58, 237, 0.3); } 50% { box-shadow: 0 0 40px rgba(124, 58, 237, 0.6); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
    }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&family=Manrope:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
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

      // Expose React & hooks globally on window for maximum resilience
      if (typeof React !== 'undefined') {
        window.React = React;
        window.useState = React.useState;
        window.useEffect = React.useEffect;
        window.useRef = React.useRef;
        window.useMemo = React.useMemo;
        window.useCallback = React.useCallback;
        window.useContext = React.useContext;
        window.createContext = React.createContext;
        window.Fragment = React.Fragment;
        window.Suspense = React.Suspense;
        window.StrictMode = React.StrictMode;
      }
      if (typeof ReactDOM !== 'undefined') {
        window.ReactDOM = ReactDOM;
      }

      // Framer Motion Global Shims
      var createMotionComponent = function(tag) {
        return React.forwardRef(function(props, ref) {
          var cleanProps = {};
          for (var k in props) {
            if (!['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'whileFocus', 'whileInView', 'viewport', 'layout', 'layoutId', 'onAnimationComplete', 'onAnimationStart', 'custom'].includes(k)) {
              cleanProps[k] = props[k];
            }
          }
          if (ref) cleanProps.ref = ref;
          return React.createElement(typeof tag === 'string' ? tag : (tag.default || tag), cleanProps);
        });
      };
      var motionProxy = new Proxy(function(Comp) { return createMotionComponent(Comp); }, {
        get: function(_, tag) { return createMotionComponent(tag); }
      });
      var AnimatePresenceShim = function(props) { return React.createElement(React.Fragment, null, props.children); };

      window.motion = motionProxy;
      window.AnimatePresence = AnimatePresenceShim;
      window.useInView = function() { return [null, true]; };
      window.useAnimation = function() { return { start: function() { return Promise.resolve(); }, set: function() {}, stop: function() {} }; };
      window.useMotionValue = function(init) { return { get: function() { return init; }, set: function() {}, onChange: function() {} }; };
      window.useTransform = function(val, from, to) { return { get: function() { return to ? to[0] : 0; } }; };
      window.useSpring = function() { return { get: function() { return 0; } }; };
      window.useScroll = function() { return { scrollX: { get: function() { return 0; } }, scrollY: { get: function() { return 0; } }, scrollXProgress: { get: function() { return 0; } }, scrollYProgress: { get: function() { return 0; } } }; };

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

      // Expose Lucide icons globally so undeclared icon tags in JSX never throw ReferenceError
      var knownIcons = ${lucideListJson};
      for (var ic = 0; ic < knownIcons.length; ic++) {
        var icName = knownIcons[ic];
        if (typeof window[icName] === 'undefined') {
          (function(n) {
            window[n] = function(props) { return React.createElement(LucideIcon, Object.assign({ iconName: n }, props)); };
          })(icName);
        }
      }

      // Custom Module Resolver
      function __require__(id) {
        if (!id) return {};

        // Extract base component name from any path format (e.g. ./components/CTA -> CTA)
        var parts = String(id).split('/');
        var cleanId = parts[parts.length - 1].replace(/\\.tsx?$/, '').trim();

        // 1. Check module registry (exact, case-insensitive, aliases, or substring match)
        var modKey = null;
        if (__modules__[cleanId]) {
          modKey = cleanId;
        } else {
          var lower = cleanId.toLowerCase();
          for (var k in __modules__) {
            if (k.toLowerCase() === lower) { modKey = k; break; }
          }
          if (!modKey) {
            var aliases = [
              cleanId + 'Section', cleanId + 'Component', cleanId + 'Nav', cleanId + 'Banner', cleanId + 'Grid',
              cleanId.endsWith('s') ? cleanId.slice(0, -1) : cleanId + 's'
            ];
            for (var a = 0; a < aliases.length; a++) {
              var aliasLower = aliases[a].toLowerCase();
              for (var k2 in __modules__) {
                if (k2.toLowerCase() === aliasLower) { modKey = k2; break; }
              }
              if (modKey) break;
            }
          }
          if (!modKey) {
            for (var k3 in __modules__) {
              if (k3.toLowerCase().includes(lower) || lower.includes(k3.toLowerCase())) { modKey = k3; break; }
            }
          }
        }

        if (modKey) {
          if (!__cache__[modKey]) {
            var modExports = {};
            var modModule = { exports: modExports };
            __cache__[modKey] = modExports;
            try {
              __modules__[modKey](modExports, __require__, modModule);
              if (modModule.exports && modModule.exports !== modExports) {
                __cache__[modKey] = modModule.exports;
              }
            } catch(err) {
              console.error('Module execution failed for [' + modKey + ']:', err);
              throw err;
            }
          }
          var cached = __cache__[modKey];
          var primary = (cached && cached.default !== undefined) ? cached.default : cached;

          // Attach named exports onto primary if it is a function/object
          if (primary && (typeof primary === 'function' || typeof primary === 'object')) {
            for (var expKey in cached) {
              if (!(expKey in primary)) {
                try { primary[expKey] = cached[expKey]; } catch(e) {}
              }
            }
          }

          // Return proxy over exports so missing named exports do not return undefined and crash React
          return new Proxy(cached, {
            get: function(target, prop) {
              if (prop in target && target[prop] !== undefined) return target[prop];
              if (prop === '__esModule') return true;
              if (prop === 'then') return undefined;
              if (typeof prop === 'symbol') return target[prop];
              if (prop === 'default') return (target && target.default !== undefined) ? target.default : target;
              if (primary && (typeof primary === 'function' || (primary && primary.$$typeof))) {
                if (prop in primary && primary[prop] !== undefined) return primary[prop];
                return primary;
              }
              var MissingComp = function(props) {
                return React.createElement('div', {
                  style: { padding: '4px 8px', margin: '2px 0', border: '1px dashed #94a3b8', borderRadius: '4px', fontSize: '11px', color: '#cbd5e1', display: 'inline-block' }
                }, String(prop));
              };
              return MissingComp;
            }
          });
        }

        // 2. React mapping
        if (cleanId === 'react') return React;
        if (cleanId === 'react-dom' || cleanId === 'react-dom/client') return ReactDOM;

        // 3. Lucide icon mapping
        if (cleanId === 'lucide-react') {
          return new Proxy({
            createLucideIcon: function(name, iconDef) {
              return function(props) { return React.createElement(LucideIcon, Object.assign({ iconName: name }, props)); };
            },
            icons: new Proxy({}, {
              get: function(_, prop) {
                return function(props) { return React.createElement(LucideIcon, Object.assign({ iconName: String(prop) }, props)); };
              }
            })
          }, {
            get: function(target, prop) {
              if (prop in target) return target[prop];
              if (typeof prop === 'string') {
                return function(props) { return React.createElement(LucideIcon, Object.assign({ iconName: prop }, props)); };
              }
              return LucideIcon;
            }
          });
        }

        // Router shims
        if (cleanId === 'react-router-dom' || cleanId === 'react-router') {
          var MemoryRouter = function(props) { return React.createElement(React.Fragment, null, props.children); };
          return {
            MemoryRouter: MemoryRouter, BrowserRouter: MemoryRouter, HashRouter: MemoryRouter,
            Routes: function(props) { return React.createElement(React.Fragment, null, props.children); },
            Route: function(props) { return props.element || React.createElement(React.Fragment, null, props.children); },
            Link: function(props) { return React.createElement('a', { href: props.to || '#', onClick: function(e) { e.preventDefault(); } }, props.children); },
            NavLink: function(props) { return React.createElement('a', { href: props.to || '#', onClick: function(e) { e.preventDefault(); } }, props.children); },
            Outlet: function() { return null; },
            Navigate: function() { return null; },
            useNavigate: function() { return function(to) { console.log('Navigation shim:', to); }; },
            useLocation: function() { return { pathname: '/', search: '', hash: '', state: null, key: 'default' }; },
            useParams: function() { return {}; },
            useSearchParams: function() { return [new URLSearchParams(), function() {}]; },
            useHref: function(to) { return to || ''; },
            useMatch: function() { return null; }
          };
        }

        // Framer Motion shims
        if (cleanId === 'framer-motion') {
          var createMotionComponent = function(tag) {
            return React.forwardRef(function(props, ref) {
              var cleanProps = {};
              for (var k in props) {
                if (!['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'whileFocus', 'whileInView', 'viewport', 'layout', 'layoutId'].includes(k)) {
                  cleanProps[k] = props[k];
                }
              }
              if (ref) cleanProps.ref = ref;
              return React.createElement(typeof tag === 'string' ? tag : (tag.default || tag), cleanProps);
            });
          };
          var motionProxy = new Proxy(function(Comp) { return createMotionComponent(Comp); }, {
            get: function(_, tag) { return createMotionComponent(tag); }
          });
          return {
            motion: motionProxy,
            AnimatePresence: function(props) { return React.createElement(React.Fragment, null, props.children); },
            useInView: function() { return [null, true]; },
            useAnimation: function() { return { start: function() { return Promise.resolve(); }, set: function() {}, stop: function() {} }; },
            useMotionValue: function(init) { return { get: function() { return init; }, set: function() {}, onChange: function() {} }; },
            useTransform: function(val, from, to) { return { get: function() { return to ? to[0] : 0; } }; },
            useSpring: function() { return { get: function() { return 0; } }; },
            useScroll: function() { return { scrollX: { get: function() { return 0; } }, scrollY: { get: function() { return 0; } }, scrollXProgress: { get: function() { return 0; } }, scrollYProgress: { get: function() { return 0; } } }; }
          };
        }

        // Clsx / CN / tailwind-merge shims
        if (cleanId === 'clsx' || cleanId === 'tailwind-merge' || cleanId === 'classnames') {
          var mergeClasses = function() { return Array.from(arguments).flat(Infinity).filter(Boolean).join(' '); };
          return { clsx: mergeClasses, cn: mergeClasses, twMerge: mergeClasses, default: mergeClasses };
        }

        // Safe Component Fallback for unrecognized packages
        var FallbackComp = function(props) {
          if (props && props.children) return React.createElement(React.Fragment, null, props.children);
          return React.createElement('div', {
            style: { padding: '8px', border: '1px dashed #64748b', borderRadius: '6px', fontSize: '12px', color: '#94a3b8' }
          }, String(cleanId));
        };
        var fallbackProxy = new Proxy(FallbackComp, {
          get: function(_, prop) {
            if (prop === 'then') return function(res) { if (res) res({ data: {} }); return Promise.resolve({ data: {} }); };
            return fallbackProxy;
          }
        });
        return fallbackProxy;
      }

      window.__require__ = __require__;

      console.log('[BUNDLE TRACE]\\nFiles:\\n' + ${JSON.stringify(transformedBlocks.map(b => '- ' + b.compName + '.tsx').join('\\n'))} + '\\n\\nApp declarations found: 1');
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
          'React', 'ReactDOM', 'LucideIcon', '__modules__', '__cache__', '__require__', 'motion', 'AnimatePresence',
          transpiledCode
        );
        evalFunc(React, ReactDOM, LucideIcon, __modules__, __cache__, __require__, window.motion, window.AnimatePresence);

        // Define component getters on window for all bundle modules so undeclared component tags resolve cleanly
        for (var modName in __modules__) {
          (function(mName) {
            if (typeof window[mName] === 'undefined') {
              try {
                Object.defineProperty(window, mName, {
                  get: function() {
                    var m = __require__(mName);
                    return (m && m.default !== undefined) ? m.default : m;
                  },
                  configurable: true
                });
              } catch(e) {}
            }
          })(modName);
        }

        // Define IframeErrorBoundary
        class IframeErrorBoundary extends React.Component {
          constructor(props) {
            super(props);
            this.state = { hasError: false, error: null, errorInfo: null };
          }
          static getDerivedStateFromError(error) {
            return { hasError: true, error: error };
          }
          componentDidCatch(error, errorInfo) {
            this.setState({ error: error, errorInfo: errorInfo });
            var errStr = (error && error.message) || String(error);
            var stackStr = (error && error.stack) || '';
            var compStack = (errorInfo && errorInfo.componentStack) || '';
            console.error('[IFRAME RENDER ERROR]', errStr, stackStr, compStack);
            showErrorOverlay('Render Error in Component:\\n' + errStr + '\\n' + stackStr + (compStack ? '\\n\\nComponent Stack:' + compStack : ''));
            sendParentLog('error', 'Render Error: ' + errStr);
            try {
              window.parent.postMessage({
                type: 'NEXSITE_PREVIEW_ERROR',
                error: errStr,
                stack: stackStr,
                componentStack: compStack
              }, '*');
            } catch(e) {}
          }
          render() {
            if (this.state.hasError) {
              return React.createElement('div', {
                style: {
                  padding: '24px',
                  background: '#18122B',
                  color: '#f87171',
                  border: '1px solid #7f1d1d',
                  borderRadius: '12px',
                  margin: '20px',
                  fontFamily: 'system-ui, sans-serif'
                }
              },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' } },
                  React.createElement('span', { style: { fontSize: '20px' } }, '⚠️'),
                  React.createElement('h3', { style: { margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#fca5a5' } }, 'Preview Render Error')
                ),
                React.createElement('div', { style: { padding: '12px', background: '#0d0b18', borderRadius: '8px', border: '1px solid #3b1d3d', color: '#fca5a5', fontFamily: 'monospace', fontSize: '13px', marginBottom: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } },
                  (this.state.error && this.state.error.message) || 'Unknown Render Error'
                ),
                this.state.errorInfo && this.state.errorInfo.componentStack ? React.createElement('details', { style: { color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' } },
                  React.createElement('summary', { style: { cursor: 'pointer', marginBottom: '6px', color: '#c084fc' } }, 'View Component Stack'),
                  React.createElement('pre', { style: { padding: '8px', background: '#0a0914', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap' } }, this.state.errorInfo.componentStack)
                ) : null
              );
            }
            return this.props.children;
          }
        }

        var rawApp = __require__('App');
        var AppComponent = (rawApp && rawApp.default !== undefined) ? rawApp.default : rawApp;

        // If AppComponent is an object containing named component functions (e.g. { SaaSWebsite: Function }), find the first valid component
        if (AppComponent && typeof AppComponent === 'object' && !AppComponent.$$typeof) {
          for (var k in AppComponent) {
            if (typeof AppComponent[k] === 'function' || (AppComponent[k] && AppComponent[k].$$typeof)) {
              AppComponent = AppComponent[k];
              break;
            }
          }
        }

        console.log('[PREVIEW TRACE] App available:', typeof AppComponent === 'function' || (typeof AppComponent === 'object' && !!AppComponent.$$typeof));

        if (!AppComponent || (typeof AppComponent !== 'function' && typeof AppComponent !== 'object')) {
          throw new Error('App component could not be resolved from module registry.');
        }

        console.log('[PREVIEW TRACE] mounting App');
        var rootEl = document.getElementById('root');
        var root = ReactDOM.createRoot(rootEl);

        function NexSiteMount() {
          React.useEffect(function() {
            console.log('[PREVIEW TRACE] NexSiteMount mounted via useEffect');
            try {
              var count = (rootEl && (rootEl.children ? rootEl.children.length : (rootEl.childNodes ? rootEl.childNodes.length : 1))) || 1;
              window.parent.postMessage({ type: 'NEXSITE_PREVIEW_READY', childrenCount: count }, '*');
              sendParentLog('info', 'PREVIEW_RENDERED');
            } catch(e) {}
          }, []);

          return React.createElement(IframeErrorBoundary, null, React.createElement(AppComponent));
        }

        root.render(React.createElement(NexSiteMount));

        var checkAttempts = 0;
        var maxCheckAttempts = 10;
        var readySent = false;

        function checkMount() {
          checkAttempts++;
          var childrenCount = (rootEl && rootEl.children) ? rootEl.children.length : 0;
          var hasContent = childrenCount > 0 || (rootEl && rootEl.childNodes && rootEl.childNodes.length > 0 && rootEl.innerHTML.trim().length > 0);

          if (hasContent) {
            if (!readySent) {
              readySent = true;
              console.log('[PREVIEW TRACE] mount succeeded, children count: ' + (childrenCount || 1));
              sendParentLog('info', 'PREVIEW_RENDERED');
              try { window.parent.postMessage({ type: 'NEXSITE_PREVIEW_READY', childrenCount: childrenCount || 1 }, '*'); } catch(e) {}
            }
          } else if (checkAttempts < maxCheckAttempts) {
            setTimeout(checkMount, 100);
          } else {
            console.warn('[PREVIEW TRACE] mount check: root element has 0 DOM children after ' + (checkAttempts * 100) + 'ms');
            var errDisplay = document.getElementById('error-display');
            if (!errDisplay || errDisplay.style.display !== 'block') {
              showErrorOverlay('Mount Warning: The root element has 0 children. Please check if your App component returns valid JSX.');
              sendParentLog('warn', 'Mount Warning: 0 children in root element');
              try { window.parent.postMessage({ type: 'NEXSITE_PREVIEW_READY', childrenCount: 0 }, '*'); } catch(e) {}
            }
          }
        }

        setTimeout(checkMount, 100);

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
  const transformedBlocks: { compName: string; code: string; exportedNames: string[] }[] = [];
  let totalDeps = 0;

  for (const compName of order) {
    const analysis = files.get(compName)!;
    const isApp = compName === 'App';
    const transformed = transformCode(analysis.code, compName, isApp);
    const exportedNames = analysis.exports.map(e => e.name);
    transformedBlocks.push({ compName, code: transformed, exportedNames });
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
    } else if (block.compName === 'App') {
      appDeclCount += 1;
      appDeclSources.push(`App.tsx (default export)`);
    }
  }

  const filesListTrace = order.map(f => `- ${f}.tsx`).join('\n');
  console.log(`[BUNDLE TRACE]\nFiles:\n${filesListTrace}\n\nApp declarations found: ${appDeclCount}${appDeclSources.length > 0 ? ` (${appDeclSources.join(', ')})` : ''}`);

  // Module wrapper ensures isolated scopes, so identical internal variable names (like 'App') in different files are perfectly safe.

  const moduleWrappedBlocks = transformedBlocks.map(b => wrapInModuleScope(b.compName, b.code, b.exportedNames));
  const concatenated = moduleWrappedBlocks.join('\n\n');

  // Build success srcdoc using module-wrapped source
  const srcdoc = buildSuccessSrcdoc(transformedBlocks, concatenated);

  const successDiag: BundleDiagnostic = {
    type: 'BUNDLE_VALID',
    message: `Bundle validation passed. ${files.size} files, ${totalDeps} dependencies, App declarations: ${appDeclCount}, order: [${order.join(', ')}]`,
  };

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
