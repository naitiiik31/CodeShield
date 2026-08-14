import { config } from '../../config/index.js';
import { OpenAIProvider } from './openaiProvider.js';
import { DisabledProvider } from './disabledProvider.js';

export function createAIProvider() {
  const providerName = (config.aiProvider || 'disabled').toLowerCase();

  switch (providerName) {
    case 'openai':
      return new OpenAIProvider(config.aiApiKey, config.aiModel || 'gpt-4o-mini');
    default:
      return new DisabledProvider();
  }
}

export { DisabledProvider } from './disabledProvider.js';
export { OpenAIProvider } from './openaiProvider.js';
