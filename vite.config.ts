import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ProviderManager } from './src/infrastructure/llm/ProviderManager.ts';
import { ModelRegistry } from './src/infrastructure/llm/ModelRegistry.ts';

// Resolve .env path relative to this file, not process.cwd()
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '.env');

// Force-load .env with override:true so re-runs always win
const dotenvResult = dotenv.config({ path: envPath, override: true });

// ─── Startup diagnostics ─────────────────────────────────────────────────────
console.log('[NexSite] ════════════════════════════════════════');
console.log('[NexSite] Backend Environment Startup Diagnostics');
console.log('[NexSite] ════════════════════════════════════════');
console.log(`[NexSite] process.cwd() = ${process.cwd()}`);
console.log(`[NexSite] .env path     = ${envPath}`);
console.log(`[NexSite] dotenv result = ${dotenvResult.error ? `ERROR: ${dotenvResult.error.message}` : `OK (${Object.keys(dotenvResult.parsed || {}).length} vars)`}`);

function maskKey(k: string): string {
  if (!k || k.length < 10) return '***';
  return k.slice(0, 6) + '...' + k.slice(-4);
}

function loadAndLogKeys(envVarName: string, providerName: string): string[] {
  const raw = process.env[envVarName] || '';
  const keys = raw.split(',').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    console.log(`[NexSite] ${providerName}: ❌ No keys (${envVarName} is empty)`);
  } else {
    console.log(`[NexSite] ${providerName}: ✅ ${keys.length} key(s) — ${keys.map(maskKey).join(', ')}`);
  }
  return keys;
}

loadAndLogKeys('NVIDIA_KEYS', 'Nvidia    ');
loadAndLogKeys('DEEPSEEK_KEYS', 'DeepSeek  ');
loadAndLogKeys('GROQ_KEYS', 'Groq      ');
loadAndLogKeys('GEMINI_KEYS', 'Gemini    ');
loadAndLogKeys('KIMI_KEYS', 'Kimi      ');
loadAndLogKeys('OPENROUTER_KEYS', 'OpenRouter');
loadAndLogKeys('TOGETHER_KEYS', 'Together  ');
loadAndLogKeys('HUGGINGFACE_KEYS', 'HuggingFace');
console.log(`[NexSite] PROVIDER_SEQUENCE = ${process.env.PROVIDER_SEQUENCE || '(default)'}`);
console.log('[NexSite] ════════════════════════════════════════');

// ─── Console log ring buffer (for /debug-logs endpoint) ──────────────────────
const MAX_LOG_LINES = 300;
const logBuffer: string[] = [];

function patchConsole() {
  const methods = ['log', 'warn', 'error', 'info'] as const;
  for (const method of methods) {
    const orig = console[method].bind(console);
    (console[method] as any) = (...args: any[]) => {
      orig(...args);
      const line = `[${method.toUpperCase()}] ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}`;
      logBuffer.push(`[${new Date().toISOString()}] ${line}`);
      if (logBuffer.length > MAX_LOG_LINES) logBuffer.shift();
    };
  }
}
patchConsole();

function backendLLMPlugin(): Plugin {
  const providerManager = new ProviderManager();

  return {
    name: 'nexsite-backend-llm-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {

        // ── Video streaming with byte-ranges (.mp4) ─────────────────────────
        if (req.url && !req.url.includes('?import') && !req.url.includes('&import') && (req.url.startsWith('/typing-bg.mp4') || req.url.startsWith('/typing-bg') || req.url.endsWith('.mp4'))) {
          const possiblePaths = [
            path.resolve(__dirname, 'public', 'typing-bg.mp4'),
            path.resolve(__dirname, 'src', 'assets', 'typing-bg.mp4'),
            path.resolve(__dirname, 'bg video', 'Developer_typing_on_mechanical_k._202608232147.mp4')
          ];
          const videoPath = possiblePaths.find(p => fs.existsSync(p));
          if (videoPath) {
            const stat = fs.statSync(videoPath);
            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
              const parts = range.replace(/bytes=/, '').split('-');
              const start = parseInt(parts[0], 10);
              const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
              const chunksize = (end - start) + 1;
              const file = fs.createReadStream(videoPath, { start, end });
              res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
                'Cache-Control': 'public, max-age=31536000, immutable'
              });
              file.pipe(res);
            } else {
              res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=31536000, immutable'
              });
              fs.createReadStream(videoPath).pipe(res);
            }
            return;
          }
        }

        // ── GET /health ──────────────────────────────────────────────────────
        if (req.url === '/health' && req.method === 'GET') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
          return;
        }

        // ── AUTH ─────────────────────────────────────────────────────────────
        // Demo users – isolated here for easy replacement with real auth
        const DEMO_USERS = [
          { id: 'usr_admin_001', name: 'NexSite Admin', email: 'admin@nexsite.ai', password: 'Admin@123', role: 'admin' as const },
          { id: 'usr_user_001',  name: 'Demo User',     email: 'user@nexsite.ai',  password: 'User@123',  role: 'user'  as const },
        ];
        // ponytail: simple base64 "signature" – replace with real HMAC/JWT for production
        const TOKEN_SECRET = 'nexsite-demo-secret-2026';
        function signToken(payload: Record<string, any>): string {
          const data = JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 });
          const sig = Buffer.from(data + '|' + TOKEN_SECRET).toString('base64');
          return Buffer.from(data).toString('base64') + '.' + sig;
        }
        function verifyToken(token: string): Record<string, any> | null {
          try {
            const [dataB64, sigB64] = token.split('.');
            const data = Buffer.from(dataB64, 'base64').toString();
            const expectedSig = Buffer.from(data + '|' + TOKEN_SECRET).toString('base64');
            if (sigB64 !== expectedSig) return null;
            const parsed = JSON.parse(data);
            if (parsed.exp && parsed.exp < Date.now()) return null;
            return parsed;
          } catch { return null; }
        }

        // POST /auth/login
        if (req.url === '/auth/login' && req.method === 'POST') {
          let body = '';
          req.on('data', (c: Buffer) => { body += c.toString(); });
          req.on('end', () => {
            try {
              const { email, password } = JSON.parse(body || '{}');
              const user = DEMO_USERS.find(u => u.email === email && u.password === password);
              if (!user) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid email or password.' }));
                return;
              }
              const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } }));
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid request body.' }));
            }
          });
          return;
        }

        // GET /auth/verify
        if (req.url === '/auth/verify' && req.method === 'GET') {
          const authHeader = req.headers['authorization'] || '';
          const token = authHeader.replace('Bearer ', '');
          const payload = verifyToken(token);
          if (!payload) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid or expired token.' }));
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ user: { id: payload.id, name: payload.name, email: payload.email, role: payload.role } }));
          return;
        }

        // POST /auth/signup (demo – adds to in-memory list for session only)
        if (req.url === '/auth/signup' && req.method === 'POST') {
          let body = '';
          req.on('data', (c: Buffer) => { body += c.toString(); });
          req.on('end', () => {
            try {
              const { name, email, password } = JSON.parse(body || '{}');
              if (!name || !email || !password) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Name, email, and password are required.' }));
                return;
              }
              if (DEMO_USERS.find(u => u.email === email)) {
                res.statusCode = 409;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'An account with this email already exists.' }));
                return;
              }
              const newUser = { id: `usr_${Date.now()}`, name, email, password, role: 'user' as const };
              DEMO_USERS.push(newUser);
              const token = signToken({ id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role });
              res.statusCode = 201;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } }));
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid request body.' }));
            }
          });
          return;
        }

        // ── GET /providers ───────────────────────────────────────────────────
        if (req.url === '/providers' && req.method === 'GET') {
          // Re-read env on each request to show live state
          dotenv.config({ path: envPath, override: true });
          const env = process.env as Record<string, string>;
          const sequence = (env['PROVIDER_SEQUENCE'] || 'Kimi,Gemini,Groq,OpenRouter,Together,HuggingFace').split(',').map(s => s.trim());
          const providers = sequence.map(name => {
            const raw = env[`${name.toUpperCase()}_KEYS`] || '';
            const keys = raw.split(',').map(k => k.trim()).filter(Boolean);
            return {
              name,
              configured: keys.length > 0,
              keyCount: keys.length,
              maskedKeys: keys.map(maskKey)
            };
          });
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ sequence, providers, envPath, cwd: process.cwd() }, null, 2));
          return;
        }

        // ── GET /models ──────────────────────────────────────────────────────
        if (req.url === '/models' && req.method === 'GET') {
          const env = process.env as Record<string, string>;
          const registry = ModelRegistry.getRegistry();
          const models: Record<string, any> = {};
          for (const [name, config] of Object.entries(registry)) {
            models[name] = {
              defaultModel: config.defaultModel,
              activeModel: env[config.envVar] || config.defaultModel,
              envVar: config.envVar,
              baseUrl: config.baseUrl
            };
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(models, null, 2));
          return;
        }

        // ── GET /debug-logs ──────────────────────────────────────────────────
        if (req.url === '/debug-logs' && req.method === 'GET') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ logs: logBuffer }));
          return;
        }

        // ── POST /generate ───────────────────────────────────────────────────
        if ((req.url === '/generate' || req.url === '/api/generate') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            const requestId = Math.random().toString(36).slice(2, 8).toUpperCase();
            console.log(`\n[/generate][${requestId}] ══ NEW REQUEST ══`);
            console.log(`[/generate][${requestId}] Body preview: ${body.slice(0, 200)}`);

            try {
              const parsed = JSON.parse(body || '{}');
              const { prompt, schemaDescription } = parsed;

              if (!prompt) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing prompt in request body.' }));
                return;
              }

              // Re-read .env on every request — handles edits without restart
              dotenv.config({ path: envPath, override: true });

              const output = await providerManager.generateJSON(
                prompt,
                schemaDescription || 'JSON Object',
                process.env as Record<string, string>
              );

              console.log(`[/generate][${requestId}] ✅ provider=${output.telemetry.providerUsed} model=${output.telemetry.model} key#${output.telemetry.apiKeyIndex} time=${output.telemetry.generationTimeMs}ms fallback=${output.telemetry.fallbackUsed}`);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(output));
            } catch (err: any) {
              console.error(`[/generate][${requestId}] ❌ ERROR: ${err.message || err}`);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'LLM Generation Error' }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), backendLLMPlugin()],
  server: {
    port: 5173,
    watch: {
      ignored: [
        '**/bg video/**',
        '**/*.mp4',
        '**/*.mkv',
        '**/*.mov',
        '**/*.avi',
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**'
      ]
    }
  }
});
