// services/aiProvider.ts
// Universal AI Provider Abstraction Layer
// Supports: Google Gemini (direct) and OpenRouter (100+ models)

import { GoogleGenAI, Type } from "@google/genai";
import { storageService } from './storageService.ts';

// ─── TYPES ───────────────────────────────────────────────────────

export type AIProviderType = 'gemini' | 'openrouter';

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey: string;
  model: string;
}

export interface AIGenerateOptions {
  prompt: string;
  jsonSchema?: any;         // Gemini-native schema (Type.OBJECT etc.)
  jsonMode?: boolean;       // For OpenRouter: request JSON output
  temperature?: number;
}

export interface AIGenerateResult {
  text: string;
}

// ─── OPENROUTER POPULAR MODELS ───────────────────────────────────

export const OPENROUTER_MODELS = [
  { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o', description: 'Most capable OpenAI model' },
  { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini', description: 'Fast & affordable OpenAI' },
  { id: 'openai/o3-mini', name: 'OpenAI o3-mini', description: 'OpenAI reasoning model' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Anthropic balanced model' },
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', description: 'Anthropic most capable' },
  { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro (via OpenRouter)', description: 'Google via OpenRouter' },
  { id: 'mistralai/mistral-large-latest', name: 'Mistral Large', description: 'Mistral flagship' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', description: 'Meta open-source' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', description: 'DeepSeek chat model' },
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', description: 'Alibaba flagship' },
];

// ─── PROVIDER DETECTION ──────────────────────────────────────────

export function getProviderConfig(): AIProviderConfig {
  const provider = storageService.getAIProvider() || 'gemini';
  const model = storageService.getCustomModel() || getDefaultModel(provider);

  let apiKey = '';
  if (provider === 'gemini') {
    apiKey = storageService.getApiKey() || '';
    // Fallback to env
    if (!apiKey && typeof process !== 'undefined' && process.env?.API_KEY) {
      apiKey = process.env.API_KEY;
    }
  } else if (provider === 'openrouter') {
    apiKey = storageService.getOpenRouterKey() || '';
  }

  return { provider, apiKey, model };
}

export function getDefaultModel(provider: AIProviderType): string {
  if (provider === 'openrouter') return 'openai/gpt-4o';
  return 'gemini-3-pro-preview';
}

// ─── VALIDATION ──────────────────────────────────────────────────

export async function validateProviderKey(provider: AIProviderType, apiKey: string): Promise<boolean> {
  if (!apiKey || apiKey.trim().length < 10) return false;

  try {
    if (provider === 'gemini') {
      if (!apiKey.startsWith('AIza') || apiKey.length < 35) return false;
      const client = new GoogleGenAI({ apiKey });
      await client.models.countTokens({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: "test" }] }]
      });
      return true;
    }

    if (provider === 'openrouter') {
      // OpenRouter keys start with 'sk-or-'
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return response.ok;
    }

    return false;
  } catch (error) {
    console.error(`${provider} API Key Validation Failed:`, error);
    return false;
  }
}

export function hasValidProviderKey(): boolean {
  const config = getProviderConfig();
  if (config.provider === 'gemini') {
    return config.apiKey.startsWith('AIza') && config.apiKey.length >= 35;
  }
  if (config.provider === 'openrouter') {
    return config.apiKey.length > 10;
  }
  return false;
}

// ─── GENERATION ──────────────────────────────────────────────────

export async function generateContent(options: AIGenerateOptions): Promise<AIGenerateResult> {
  const config = getProviderConfig();

  if (!config.apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  if (config.provider === 'gemini') {
    return generateWithGemini(config, options);
  }

  if (config.provider === 'openrouter') {
    return generateWithOpenRouter(config, options);
  }

  throw new Error(`Unknown AI provider: ${config.provider}`);
}

// ─── GEMINI ADAPTER ──────────────────────────────────────────────

async function generateWithGemini(config: AIProviderConfig, options: AIGenerateOptions): Promise<AIGenerateResult> {
  const client = new GoogleGenAI({ apiKey: config.apiKey });

  const generateConfig: any = {};
  if (options.jsonSchema) {
    generateConfig.responseMimeType = "application/json";
    generateConfig.responseSchema = options.jsonSchema;
  }
  if (options.temperature !== undefined) {
    generateConfig.temperature = options.temperature;
  }

  try {
    const response = await client.models.generateContent({
      model: config.model,
      contents: options.prompt,
      config: Object.keys(generateConfig).length > 0 ? generateConfig : undefined,
    });

    return { text: response.text.trim() };
  } catch (e: any) {
    handleProviderError(e, 'gemini');
    throw e; // TypeScript: unreachable, but satisfies compiler
  }
}

// ─── OPENROUTER ADAPTER ─────────────────────────────────────────

async function generateWithOpenRouter(config: AIProviderConfig, options: AIGenerateOptions): Promise<AIGenerateResult> {
  const messages: any[] = [
    { role: 'user', content: options.prompt }
  ];

  // If JSON mode requested, add a system message instructing JSON output
  if (options.jsonSchema || options.jsonMode) {
    messages.unshift({
      role: 'system',
      content: 'You are a professional EU project assistant. You MUST respond with valid JSON only. No markdown, no code fences, no explanations – just the raw JSON object or array.'
    });
  }

  const body: any = {
    model: config.model,
    messages: messages,
  };

  // OpenRouter supports response_format for JSON mode on compatible models
  if (options.jsonSchema || options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'EU Intervention Logic AI Assistant'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;

      if (response.status === 401 || response.status === 403) {
        throw new Error('MISSING_API_KEY');
      }
      if (response.status === 429) {
        throw new Error('Google Gemini API Quota Exceeded. You have reached the limit for the free tier. Please try again later or switch to a paid plan.');
      }
      throw new Error(`OpenRouter Error: ${errorMsg}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';

    if (!text) {
      throw new Error('OpenRouter returned empty response');
    }

    return { text };
  } catch (e: any) {
    if (e.message === 'MISSING_API_KEY' || e.message?.includes('Quota')) {
      throw e;
    }
    handleProviderError(e, 'openrouter');
    throw e;
  }
}

// ─── ERROR HANDLING ──────────────────────────────────────────────

function handleProviderError(e: any, provider: string): never {
  const msg = e.message || e.toString();

  if (msg === 'MISSING_API_KEY' || msg.includes('400') || msg.includes('403') || msg.includes('API key not valid') || msg.includes('401')) {
    throw new Error('MISSING_API_KEY');
  }

  if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('rate limit')) {
    throw new Error("API Quota Exceeded. You have reached the rate limit. Please try again later or switch to a different model/plan.");
  }

  console.error(`${provider} API Error:`, e);
  throw new Error(`AI Generation Failed (${provider}): ${msg.substring(0, 150)}...`);
}
