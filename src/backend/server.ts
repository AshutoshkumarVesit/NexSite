import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ProviderManager } from '../infrastructure/llm/ProviderManager';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const providerManager = new ProviderManager();

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
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

app.listen(port, () => {
  console.log(`[NexSite LLM Backend] Express server running on http://localhost:${port}`);
  console.log(`[NexSite LLM Backend] Provider sequence: ${process.env.PROVIDER_SEQUENCE || 'Gemini,Groq,OpenRouter,Together,HuggingFace,Mock'}`);
});

export default app;
