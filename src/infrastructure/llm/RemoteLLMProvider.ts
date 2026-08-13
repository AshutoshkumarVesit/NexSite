import type { ILLMProvider, LLMRequestOptions } from '../../core/interfaces/ILLMProvider';
import type { GenerationTelemetry } from './ProviderManager';

export interface RemoteLLMResponse<T> {
  result: T;
  telemetry: GenerationTelemetry;
}

export class RemoteLLMProvider implements ILLMProvider {
  public readonly name = 'RemoteLLMProvider';
  private apiEndpoint: string;

  constructor(apiEndpoint = '/generate') {
    this.apiEndpoint = apiEndpoint;
  }

  public async generateText(prompt: string, _options?: LLMRequestOptions): Promise<string> {
    const res = await this.generateJSON<{ text?: string; response?: string }>(
      prompt,
      'Object with text property containing generated response'
    );
    return res.text || res.response || JSON.stringify(res);
  }

  public async generateJSON<T>(prompt: string, schemaDescription: string, _options?: LLMRequestOptions): Promise<T> {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        schemaDescription
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`RemoteLLMProvider HTTP Error (${response.status}): ${errText}`);
    }

    const json: RemoteLLMResponse<T> = await response.json();
    
    // Log backend telemetry for transparency
    if (json.telemetry) {
      console.log(`[RemoteLLMProvider] Provider: ${json.telemetry.providerUsed} (${json.telemetry.model}), KeyIndex: ${json.telemetry.apiKeyIndex}, Time: ${json.telemetry.generationTimeMs}ms, Retries: ${json.telemetry.retryCount}, Fallback: ${json.telemetry.fallbackUsed}`);
    }

    return json.result;
  }
}
