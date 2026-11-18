import type { AiProvider } from '../../../database/schema/ai-providers';
import { AnthropicAdapter } from './anthropic.adapter';
import { OpenAiCompatibleAdapter } from './openai-compatible.adapter';
import type { LlmAdapter } from './llm.types';

export interface ProviderInfo {
  id: AiProvider;
  name: string;
  /** Prefixo típico da chave, só para orientar o preenchimento (não é validação). */
  keyHint: string;
  /** Modelos preferidos, em ordem; o primeiro disponível na conta vira o padrão. */
  preferredModels: string[];
  links: { buyCredits: string; createKey: string; pricing: string; help?: string };
  billingNote: string;
}

/** Links oficiais da Proposta Comercial v4.2, seção 08 (consultados em 16/11/2026). */
export const PROVIDER_CATALOG: Record<AiProvider, ProviderInfo> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    keyHint: 'sk-ant-…',
    preferredModels: ['claude-sonnet-4-6', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
    links: {
      buyCredits: 'https://platform.claude.com/settings/billing',
      createKey: 'https://platform.claude.com/settings/keys',
      pricing: 'https://www.anthropic.com/pricing#api',
      help: 'https://support.anthropic.com/en/articles/8977456-how-do-i-pay-for-my-api-usage',
    },
    billingNote: 'A assinatura Claude Pro/Max não inclui a API: compre créditos no Console.',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    keyHint: 'sk-…',
    preferredModels: ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4o'],
    links: {
      buyCredits: 'https://platform.openai.com/settings/organization/billing/overview',
      createKey: 'https://platform.openai.com/api-keys',
      pricing: 'https://openai.com/api/pricing',
      help: 'https://help.openai.com/en/articles/8264644-setting-up-and-managing-prepaid-api-billing',
    },
    billingNote: 'Cobrança pré-paga; compra inicial mínima publicada de US$ 5. ChatGPT Plus/Pro não inclui a API.',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    keyHint: 'AIza… ou AQ.…',
    // 11/2026: 2.x retirados para contas novas (404); Pro sem cota gratuita (429 limit: 0);
    // Flash 3.x instável no nível gratuito. Flash-Lite responde em conta gratuita.
    preferredModels: ['gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-2.5-flash'],
    links: {
      buyCredits: 'https://ai.google.dev/gemini-api/docs/billing?hl=pt-BR',
      createKey: 'https://aistudio.google.com/api-keys',
      pricing: 'https://ai.google.dev/gemini-api/docs/pricing',
    },
    billingNote: 'Ative o faturamento do projeto no AI Studio. Google AI Pro/Ultra não inclui a API.',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    keyHint: 'sk-or-…',
    preferredModels: ['anthropic/claude-sonnet-4.6', 'openai/gpt-4.1-mini', 'google/gemini-2.5-flash'],
    links: {
      buyCredits: 'https://openrouter.ai/settings/credits',
      createKey: 'https://openrouter.ai/settings/keys',
      pricing: 'https://openrouter.ai/pricing',
    },
    billingNote: 'Agregador de modelos: compre créditos na OpenRouter (pode haver taxa na compra).',
  },
};

const NON_CHAT = /audio|realtime|tts|transcribe|whisper|dall-e|image|embedding|moderation|search|computer-use|davinci|babbage|aqa|imagen|veo/i;

const ADAPTERS: Record<AiProvider, LlmAdapter> = {
  anthropic: new AnthropicAdapter(),
  openai: new OpenAiCompatibleAdapter({
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    maxTokensField: 'max_completion_tokens',
    modelFilter: (id) => /^(gpt-|o\d|chatgpt-)/.test(id) && !NON_CHAT.test(id),
  }),
  gemini: new OpenAiCompatibleAdapter({
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    maxTokensField: 'max_tokens',
    modelFilter: (id) => id.startsWith('gemini') && !NON_CHAT.test(id),
  }),
  openrouter: new OpenAiCompatibleAdapter({
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    maxTokensField: 'max_tokens',
    extraHeaders: { 'X-Title': 'Walletz Studio IA' },
  }),
};

export function getAdapter(provider: AiProvider): LlmAdapter {
  return ADAPTERS[provider];
}

/** Escolhe o modelo padrão entre os disponíveis na conta do cliente. */
export function pickDefaultModel(provider: AiProvider, available: string[]): string | null {
  return modelCandidates(provider, available)[0] ?? null;
}

/**
 * Modelos a testar, na ordem: preferidos disponíveis (exatos, depois versões datadas,
 * ex.: "claude-sonnet-4-6-20260101") e, por fim, o primeiro da lista do provedor.
 */
export function modelCandidates(provider: AiProvider, available: string[]): string[] {
  const preferred = PROVIDER_CATALOG[provider].preferredModels;
  const out: string[] = [];
  const add = (m: string | undefined) => {
    if (m && !out.includes(m)) out.push(m);
  };
  for (const model of preferred) if (available.includes(model)) add(model);
  for (const model of preferred) add(available.find((id) => id.startsWith(`${model}-`)));
  add(available[0]);
  return out;
}
