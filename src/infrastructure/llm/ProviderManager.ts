import { ModelRegistry, type ProviderType } from './ModelRegistry.ts';
import { MockLLMProvider } from './MockLLMProvider.ts';

export interface GenerationTelemetry {
  providerUsed: ProviderType;
  model: string;
  apiKeyIndex: number;
  generationTimeMs: number;
  retryCount: number;
  fallbackUsed: boolean;
  fallbackChain: string[];
}

export interface LLMResponseWithTelemetry<T = any> {
  result: T;
  telemetry: GenerationTelemetry;
}

// Providers that do NOT support response_format: json_object
const NO_JSON_FORMAT_PROVIDERS: Set<string> = new Set(['Kimi', 'HuggingFace']);

export class ProviderManager {
  private mockProvider: MockLLMProvider;
  private keyIndices: Record<string, number> = {};

  constructor() {
    this.mockProvider = new MockLLMProvider();
  }

  public async generateJSON<T>(
    prompt: string,
    schemaDescription: string,
    envOverrides?: Record<string, string>
  ): Promise<LLMResponseWithTelemetry<T>> {
    const startTime = Date.now();
    const env = { ...(typeof process !== 'undefined' ? process.env : {}), ...(envOverrides || {}) } as Record<string, string>;

    const sequenceEnv = env['PROVIDER_SEQUENCE'] || 'Nvidia,DeepSeek,Kimi,Gemini,Groq,OpenRouter,Together,HuggingFace';
    const rawSequence = sequenceEnv.split(',').map(s => s.trim()).filter(Boolean) as ProviderType[];
    const providerSequence: ProviderType[] = [...rawSequence, 'Mock'];

    let retryCount = 0;
    const fallbackChain: string[] = [];

    for (let i = 0; i < providerSequence.length; i++) {
      const provider = providerSequence[i];
      fallbackChain.push(provider);

      if (provider === 'Mock') {
        console.log(`[ProviderManager] Using Mock provider (fallback after ${retryCount} retries)`);
        const mockResult = await this.mockProvider.generateJSON<T>(prompt, schemaDescription);
        return {
          result: mockResult,
          telemetry: {
            providerUsed: 'Mock',
            model: 'mock-llm-v1',
            apiKeyIndex: 0,
            generationTimeMs: Date.now() - startTime,
            retryCount,
            fallbackUsed: i > 0,
            fallbackChain
          }
        };
      }

      const keys = this.getApiKeys(provider, env);
      if (keys.length === 0) {
        console.log(`[ProviderManager] Skipping ${provider}: no API keys configured.`);
        continue;
      }

      const startIndex = this.keyIndices[provider] || 0;
      for (let attempt = 0; attempt < keys.length; attempt++) {
        const keyIndex = (startIndex + attempt) % keys.length;
        const apiKey = keys[keyIndex];
        const modelName = ModelRegistry.getModelName(provider, env);
        const maskedKey = apiKey.slice(0, 6) + '...' + apiKey.slice(-4);
        const attemptStartTime = Date.now();

        console.log(`\n========== REQUEST ==========`);
        console.log(`Provider: ${provider}`);
        console.log(`Model: ${modelName}`);
        console.log(`Key Index: ${keyIndex} (${maskedKey})`);
        console.log(`Prompt: ${prompt.slice(0, 150)}...`);

        try {
          const rawText = await this.executeProviderRequest(provider, modelName, apiKey, prompt, schemaDescription);
          const parsed = this.cleanAndParseJSON<T>(rawText);
          this.keyIndices[provider] = (keyIndex + 1) % keys.length;
          const execTime = Date.now() - attemptStartTime;

          console.log(`Response: ${rawText.slice(0, 200)}...`);
          console.log(`Execution Time: ${execTime}ms`);
          console.log(`Success: true`);
          console.log(`Fallback Triggered: ${i > 0}`);
          console.log(`=============================\n`);

          return {
            result: parsed,
            telemetry: {
              providerUsed: provider,
              model: modelName,
              apiKeyIndex: keyIndex,
              generationTimeMs: Date.now() - startTime,
              retryCount,
              fallbackUsed: i > 0,
              fallbackChain
            }
          };
        } catch (err: any) {
          retryCount++;
          const execTime = Date.now() - attemptStartTime;
          const reason = err.message || String(err);
          console.log(`Response: ERROR (${reason.slice(0, 150)})`);
          console.log(`Execution Time: ${execTime}ms`);
          console.log(`Success: false`);
          console.log(`Fallback Triggered: true`);
          console.log(`Reason: ${reason}`);
          console.log(`=============================\n`);
        }
      }

      console.warn(`[ProviderManager] All ${keys.length} key(s) for ${provider} exhausted. Falling back to next provider in sequence.`);
    }

    // Ultimate Safety Net
    console.error('[ProviderManager] All providers failed. Using Mock as last resort.');
    const finalMock = await this.mockProvider.generateJSON<T>(prompt, schemaDescription);
    return {
      result: finalMock,
      telemetry: {
        providerUsed: 'Mock',
        model: 'mock-llm-v1',
        apiKeyIndex: 0,
        generationTimeMs: Date.now() - startTime,
        retryCount,
        fallbackUsed: true,
        fallbackChain
      }
    };
  }

  private getApiKeys(provider: ProviderType, env: Record<string, string>): string[] {
    const envKeyMap: Record<string, string> = {
      Nvidia: 'NVIDIA_KEYS',
      DeepSeek: 'DEEPSEEK_KEYS',
      Kimi: 'KIMI_KEYS',
      Gemini: 'GEMINI_KEYS',
      Groq: 'GROQ_KEYS',
      OpenRouter: 'OPENROUTER_KEYS',
      Together: 'TOGETHER_KEYS',
      HuggingFace: 'HUGGINGFACE_KEYS',
      Mistral: 'MISTRAL_KEYS'
    };

    const raw = env[envKeyMap[provider] || ''] || '';
    return raw.split(',').map(k => k.trim()).filter(Boolean);
  }

  private async executeProviderRequest(
    provider: ProviderType,
    model: string,
    apiKey: string,
    prompt: string,
    schemaDescription: string
  ): Promise<string> {
    const fullPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON matching this schema: ${schemaDescription}. No markdown fences, no explanation, JSON only.`;

    if (provider === 'Gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini HTTP ${response.status}: ${errText.slice(0, 300)}`);
      }

      const json = (await response.json()) as any;
      return json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // OpenAI-compatible path for Kimi, Groq, OpenRouter, Together, HuggingFace
    const baseUrl = ModelRegistry.getBaseUrl(provider);
    if (!baseUrl) {
      throw new Error(`ProviderManager: No baseUrl for provider ${provider}`);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    if (provider === 'OpenRouter') {
      headers['HTTP-Referer'] = 'https://nexsite.ai';
      headers['X-Title'] = 'NexSite Engine';
    }

    const body: Record<string, any> = {
      model,
      messages: [
        { role: 'system', content: 'You are a JSON generation engine. Always respond with valid JSON only. No markdown, no explanation.' },
        { role: 'user', content: fullPrompt }
      ],
      temperature: 0.2
    };

    // Only add response_format for providers that support it
    if (!NO_JSON_FORMAT_PROVIDERS.has(provider)) {
      body['response_format'] = { type: 'json_object' };
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${provider} HTTP ${response.status}: ${errText.slice(0, 300)}`);
    }

    const json = (await response.json()) as any;
    return json?.choices?.[0]?.message?.content || '';
  }

  private cleanAndParseJSON<T>(rawText: string): T {
    if (!rawText || !rawText.trim()) {
      throw new Error('Empty response from LLM.');
    }

    let cleaned = rawText.trim();

    // Strip markdown code fences if present (including ```tsx, ```jsx, ```json, etc.)
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*[\r\n]*/, '').replace(/[\r\n]*```$/, '').trim();
    }

    try {
      // Attempt 1: Direct JSON parse
      return JSON.parse(cleaned) as T;
    } catch (_e1) {
      try {
        // Attempt 2: Extract JSON substring between first { or [ and last } or ]
        const firstBrace = cleaned.search(/[{[]/);
        if (firstBrace >= 0) {
          const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
          if (lastBrace > firstBrace) {
            const jsonSub = cleaned.substring(firstBrace, lastBrace + 1);
            return JSON.parse(jsonSub) as T;
          }
        }
      } catch (_e2) {
        // Ignored, proceed to raw code fallback
      }

      // Attempt 3: Format C & D Fallback — raw React code returned by LLM
      if (cleaned.includes('export default') || cleaned.includes('function') || cleaned.includes('const App')) {
        return { 'App.tsx': cleaned } as unknown as T;
      }

      throw new Error(`Failed to parse LLM JSON response: ${cleaned.slice(0, 150)}...`);
    }
  }
}
