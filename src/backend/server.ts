import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { ProviderManager } from '../infrastructure/llm/ProviderManager.ts';

dotenv.config();

const app = express();
const port: number = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const providerManager = new ProviderManager();

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Simple in-memory users for basic auth
const users = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'user', password: 'user123', role: 'user' },
];

// Auth login endpoint
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const found = users.find(u => u.username === username && u.password === password);
  if (!found) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = Buffer.from(`${found.username}:${found.role}`).toString('base64');
  res.json({ token, role: found.role });
});

app.post('/generate', async (req, res) => {
  try {
    const { prompt, schemaDescription } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt in request body.' });
    }

    const output = await providerManager.generateJSON(
      prompt,
      schemaDescription || 'JSON Object'
    );

    res.json(output);
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Internal Server Error',
      timestamp: new Date().toISOString()
    });
  }
});

// Alias for /api/generate
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, schemaDescription } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt in request body.' });
    }
    const output = await providerManager.generateJSON(prompt, schemaDescription || 'JSON Object');
    res.json(output);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Serve frontend build in production if dist exists
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Express 5 compatible SPA fallback
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/auth') && req.path !== '/health') {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

const host = '0.0.0.0';
app.listen(port, host, () => {
  console.log(`[NexSite LLM Backend] Express server running on http://${host}:${port}`);
  console.log(`[NexSite LLM Backend] Provider sequence: ${process.env.PROVIDER_SEQUENCE || 'Groq,Mistral,OpenRouter,Nvidia'}`);
});

export default app;
