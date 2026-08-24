export type ProviderType = 'Nvidia' | 'DeepSeek' | 'Kimi' | 'Gemini' | 'Groq' | 'OpenRouter' | 'Together' | 'HuggingFace' | 'Mistral' | 'Mock';

export interface ModelConfig {
  provider: ProviderType;
  defaultModel: string;
  envVar: string;
  baseUrl?: string;
}

export class ModelRegistry {
  private static registry: Record<Exclude<ProviderType, 'Mock'>, ModelConfig> = {
    Nvidia: {
      provider: 'Nvidia',
      defaultModel: 'meta/llama-3.1-70b-instruct',
      envVar: 'NVIDIA_MODEL',
      baseUrl: 'https://integrate.api.nvidia.com/v1'
    },
    DeepSeek: {
      provider: 'DeepSeek',
      defaultModel: 'deepseek-chat',
      envVar: 'DEEPSEEK_MODEL',
      baseUrl: 'https://api.deepseek.com/v1'
    },
    Kimi: {
      provider: 'Kimi',
      defaultModel: 'moonshot-v1-8k',
      envVar: 'KIMI_MODEL',
      baseUrl: 'https://api.moonshot.cn/v1'
    },
    Gemini: {
      provider: 'Gemini',
      defaultModel: 'gemini-1.5-pro',
      envVar: 'GEMINI_MODEL',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
    },
    Groq: {
      provider: 'Groq',
      defaultModel: 'openai/gpt-oss-120b',
      envVar: 'GROQ_MODEL',
      baseUrl: 'https://api.groq.com/openai/v1'
    },
    OpenRouter: {
      provider: 'OpenRouter',
      defaultModel: 'deepseek/deepseek-chat',
      envVar: 'OPENROUTER_MODEL',
      baseUrl: 'https://openrouter.ai/api/v1'
    },
    Together: {
      provider: 'Together',
      defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      envVar: 'TOGETHER_MODEL',
      baseUrl: 'https://api.together.xyz/v1'
    },
    HuggingFace: {
      provider: 'HuggingFace',
      defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
      envVar: 'HUGGINGFACE_MODEL',
      baseUrl: 'https://api-inference.huggingface.co/v1'
    },
    Mistral: {
      provider: 'Mistral',
      defaultModel: 'mistral-small-latest',
      envVar: 'MISTRAL_MODEL',
      baseUrl: 'https://api.mistral.ai/v1'
    }
  };

  public static getModelName(provider: ProviderType, envOverrides?: Record<string, string>): string {
    if (provider === 'Mock') return 'mock-llm-v1';
    const config = this.registry[provider];
    if (!config) return 'default-model';

    const env = (envOverrides || (typeof process !== 'undefined' ? process.env : {})) as Record<string, string>;
    return env[config.envVar] || config.defaultModel;
  }

  public static getBaseUrl(provider: ProviderType): string | undefined {
    if (provider === 'Mock') return undefined;
    return this.registry[provider]?.baseUrl;
  }

  public static getRegistry(): Record<Exclude<ProviderType, 'Mock'>, ModelConfig> {
    return { ...this.registry };
  }
}
