import { GoogleGenAI } from '@google/genai';
import type { ILLMProvider, LLMRequestOptions } from '../../core/interfaces/ILLMProvider';

export class GeminiProvider implements ILLMProvider {
  public readonly name = 'GeminiProvider';
  private ai: GoogleGenAI | null = null;
  private primaryModel: string;
  private candidateModels = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash-exp', 'gemini-1.5-pro'];

  constructor(apiKey?: string, modelName: string = 'gemini-2.0-flash') {
    this.primaryModel = modelName;
    const key = apiKey || (import.meta.env?.VITE_GEMINI_API_KEY as string) || '';
    if (key) {
      this.ai = new GoogleGenAI({ apiKey: key });
    }
  }

  public setApiKey(apiKey: string): void {
    if (apiKey && apiKey.trim()) {
      this.ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    }
  }

  public async generateText(prompt: string, options?: LLMRequestOptions): Promise<string> {
    if (!this.ai) {
      throw new Error('Gemini API Key not configured. Please enter a valid Gemini API Key in the header or set VITE_GEMINI_API_KEY.');
    }

    const modelsToTry = Array.from(new Set([this.primaryModel, ...this.candidateModels]));
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        return await this.callModel(model, prompt, options);
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err.message || err);

        // If rate limited (429), try next candidate model after brief pause
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota exceeded')) {
          console.warn(`[GeminiProvider] Quota reached on ${model}. Trying next candidate model...`);
          await new Promise(res => setTimeout(res, 1500));
          continue;
        }

        // If model not found, try next candidate
        if (errMsg.includes('404') || errMsg.includes('NOT_FOUND') || errMsg.includes('not found') || errMsg.includes('no longer available')) {
          console.warn(`[GeminiProvider] Model ${model} not available. Trying next candidate model...`);
          continue;
        }

        throw err;
      }
    }

    const finalErrMsg = String(lastError?.message || lastError);
    if (finalErrMsg.includes('429') || finalErrMsg.includes('Quota exceeded') || finalErrMsg.includes('RESOURCE_EXHAUSTED')) {
      throw new Error(
        `Gemini API Quota Exceeded (HTTP 429). The current API key has reached its daily/per-minute request limit. You can paste a new API key in the top header, or switch to 'Mock LLM Provider' for instant quota-free generation.`
      );
    }

    throw new Error(`Gemini LLM Execution Error: ${finalErrMsg}`);
  }

  private async callModel(model: string, prompt: string, options?: LLMRequestOptions): Promise<string> {
    const response = await this.ai!.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: options?.maxTokens ?? 2048,
        systemInstruction: options?.systemPrompt
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini API returned an empty response.');
    }
    return text;
  }

  public async generateJSON<T>(prompt: string, schemaDescription: string, options?: LLMRequestOptions): Promise<T> {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid raw JSON matching this schema (${schemaDescription}). Do not include any markdown formatting, preambles, or explanations.`;
    
    const rawResponse = await this.generateText(jsonPrompt, {
      ...options,
      responseFormat: 'json'
    });

    return this.cleanAndParseJSON<T>(rawResponse);
  }

  public cleanAndParseJSON<T>(rawText: string): T {
    let cleanText = rawText.trim();

    // Strip markdown code fences if present (```json ... ``` or ``` ...)
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    // Extract first JSON object substring if surrounding text exists
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(cleanText) as T;
    } catch (parseErr: any) {
      throw new Error(`Failed to parse JSON response from LLM: ${parseErr.message}\nRaw Text:\n${rawText}`);
    }
  }
}
