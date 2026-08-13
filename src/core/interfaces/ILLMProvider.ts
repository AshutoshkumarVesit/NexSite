export interface LLMRequestOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  responseFormat?: 'json' | 'text';
}

export interface ILLMProvider {
  readonly name: string;
  generateText(prompt: string, options?: LLMRequestOptions): Promise<string>;
  generateJSON<T>(prompt: string, schemaDescription: string, options?: LLMRequestOptions): Promise<T>;
}
