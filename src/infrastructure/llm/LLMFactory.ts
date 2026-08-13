import type { ILLMProvider } from '../../core/interfaces/ILLMProvider';
import { MockLLMProvider } from './MockLLMProvider';
import { RemoteLLMProvider } from './RemoteLLMProvider';

export type ProviderType = 'remote' | 'mock';

export class LLMFactory {
  private static remoteProvider = new RemoteLLMProvider();
  private static mockProvider = new MockLLMProvider();

  public static getProvider(type: ProviderType = 'remote'): ILLMProvider {
    if (type === 'mock') {
      return this.mockProvider;
    }
    return this.remoteProvider;
  }
}
