// services/aiProvider.ts
// ═══════════════════════════════════════════════════════════════
// Universal AI Provider Abstraction Layer – v3.0 (2026-02-18)
// ═══════════════════════════════════════════════════════════════
// CHANGELOG:
// v3.0 – NEW: OpenAI (ChatGPT) provider support
//         Added OPENAI_MODELS, generateWithOpenAI adapter,
//         validateOpenAI, hasValidProviderKey for 'openai'
// v2.0 – FIX: Dynamic max_tokens for OpenRouter
// v1.0 – Initial version.
// ═══════════════════════════════════════════════════════════════

import { GoogleGenAI, Type } from "@google/genai";
import { storageService } from './storageService.ts';
import { OPENROUTER_SYSTEM_PROMPT } from './Instructions.ts';

// ─── TYPES ───────────────────────────────────────────────────────

export type AIProviderType = 'gemini' | 'openrouter' | 'openai';

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey: string;
  model: string;
}

export interface AIGenerateOptions {
  prompt: string;
  jsonSchema?: any;
  jsonMode?: boolean;
  temperature?: number;
  sectionKey?: string;
}

export interface AIGenerateResult {
  text: string;
}

// ─── ★ FIX v2.0: DYNAMIC MAX_TOKENS PER SECTION ─────────────────

const SECTION_MAX_TOKENS: Record<string, number> = {
  activities:          16384,
  expectedResults:     8192,
  projectManagement:   8192,
  risks:               6144,
  objectives:          6144,
  problemAnalysis:     4096,
  projectIdea:         4096,
  outputs:             4096,
  outcomes:            4096,
  impacts:             4096,
  kers:                4096,
  field:               2048,
  summary:             4096,
  translation:         8192,
};

const DEFAULT_MAX_TOKENS = 4096;

function getMaxTokensForSection(sectionKey?: string): number {
  if (!sectionKey) return DEFAULT_MAX_TOKENS;
  return SECTION_MAX_TOKENS[sectionKey] || DEFAULT_MAX_TOKENS;
}

// ─── GEMINI MODELS ───────────────────────────────────────────────

export const GEMINI_MODELS = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)', description: 'Most intelligent — multimodal, agentic, reasoning' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', description: 'Balanced speed & intelligence' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Advanced thinking — code, math, STEM, long context' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Best price-performance — fast, thinking enabled' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', description: 'Ultra fast — cost-efficient, high throughput' },
  { id: 'gemini-2.5-flash-preview-09-2025', name: 'Gemini 2.5 Flash Preview (Sep 2025)', description: 'Latest Flash preview with enhancements' },
  { id: 'gemini-2.5-flash-lite-preview-09-2025', name: 'Gemini 2.5 Flash-Lite Preview (Sep 2025)', description: 'Latest Flash-Lite preview' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (⚠ deprecated)', description: 'Shutdown March 31, 2026 — migrate to 2.5+' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite (⚠ deprecated)', description: 'Shutdown March 31, 2026 — migrate to 2.5+' },
];

// ─── ★ v3.0: OPENAI MODELS ──────────────────────────────────────

export const OPENAI_MODELS = [
  // ═══ GPT-5.2 (Latest Flagship) ═══
  { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Best model for coding and agentic tasks across industries' },
  { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', description: 'Smarter and more precise responses' },

  // ═══ GPT-5.1 ═══
  { id: 'gpt-5.1', name: 'GPT-5.1', description: 'Coding and agentic tasks with configurable reasoning effort' },

  // ═══ GPT-5 ═══
  { id: 'gpt-5', name: 'GPT-5', description: 'Intelligent reasoning model for complex tasks' },
  { id: 'gpt-5-pro', name: 'GPT-5 Pro', description: 'Smarter and more precise version of GPT-5' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Faster, cost-efficient version of GPT-5' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Fastest, most cost-efficient version of GPT-5' },

  // ═══ GPT-4.1 ═══
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Smartest non-reasoning model' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Smaller, faster version of GPT-4.1' },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', description: 'Fastest, most cost-efficient version of GPT-4.1' },

  // ═══ GPT-4o (Legacy) ═══
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Fast, intelligent, flexible GPT model' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast, affordable small model for focused tasks' },
];

// ─── OPENROUTER POPULAR MODELS ───────────────────────────────────

export const OPENROUTER_MODELS = [
  { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o', description: 'Most capable OpenAI model' },
  { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini', description: 'Fast & affordable OpenAI' },
  { id: 'openai/o3-mini', name: 'OpenAI o3-mini', description: 'OpenAI reasoning model' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Anthropic balanced model' },
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', description: 'Anthropic most capable' },
  { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro (via OpenRouter)', description: 'Google via OpenRouter' },
  { id: 'deepseek/deepseek-v3.2', name: '🇨🇳 DeepSeek V3.2', description: 'DeepSeek flagship – top open-source, MoE 671B' },
  { id: 'deepseek/deepseek-r1', name: '🇨🇳 DeepSeek R1', description: 'DeepSeek reasoning model – rivals OpenAI o1' },
  { id: 'deepseek/deepseek-r1-0528', name: '🇨🇳 DeepSeek R1 0528', description: 'Latest R1 update – enhanced reasoning' },
  { id: 'moonshotai/kimi-k2.5', name: '🇨🇳 Kimi K2.5 (Moonshot AI)', description: '#1 open-source – reasoning + visual coding' },
  { id: 'moonshotai/kimi-k2', name: '🇨🇳 Kimi K2 (Moonshot AI)', description: '1T param MoE – coding & agentic tasks' },
  { id: 'z-ai/glm-5', name: '🇨🇳 GLM-5 (Zhipu AI)', description: 'Z.AI latest flagship – frontier open-source' },
  { id: 'z-ai/glm-4.5-air:free', name: '🇨🇳 GLM-4.5 Air (FREE)', description: 'Zhipu AI – free lightweight model' },
  { id: 'qwen/qwen3-235b-a22b', name: '🇨🇳 Qwen3 235B A22B (Alibaba)', description: 'Alibaba MoE 235B – top reasoning & coding' },
  { id: 'qwen/qwen3-max', name: '🇨🇳 Qwen3 Max (Alibaba)', description: 'Alibaba cloud-hosted flagship' },
  { id: 'qwen/qwen3-coder', name: '🇨🇳 Qwen3 Coder (Alibaba)', description: 'Alibaba coding specialist – 480B MoE' },
  { id: 'minimax/minimax-m2.1', name: '🇨🇳 MiniMax M2.1', description: 'MiniMax flagship – coding & agents, efficient' },
  { id: 'minimax/minimax-m2', name: '🇨🇳 MiniMax M2', description: 'MiniMax – compact high-performance model' },
  { id: 'meta-llama/llama-4-maverick', name: '🦙 Llama 4 Maverick (Meta)', description: 'Meta MoE 128 experts – top Llama model' },
  { id: 'meta-llama/llama-4-scout', name: '🦙 Llama 4 Scout (Meta)', description: 'Meta MoE 16 experts – fast & efficient' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: '🦙 Llama 3.3 70B (Meta)', description: 'Meta proven workhorse – great price/quality' },
  { id: 'mistralai/mistral-large-2512', name: '🇫🇷 Mistral Large 3 (Dec 2025)', description: 'Mistral flagship – 262K context' },
  { id: 'mistralai/devstral-2512', name: '🇫🇷 Devstral 2 (Mistral)', description: 'Mistral agentic coding specialist – 123B MoE' },
  { id: 'mistralai/mistral-small-2503', name: '🇫🇷 Mistral Small (Mar 2025)', description: 'Mistral lightweight – fast responses' },
];

// ─── PROVIDER DETECTION ──────────────────────────────────────────

export function getProviderConfig(): AIProviderConfig {
  const provider = storageService.getAIProvider() || 'gemini';
  const model = storageService.getCustomModel() || getDefaultModel(provider);

  let apiKey = '';
  if (provider === 'gemini') {
    apiKey = storageService.getApiKey() || '';
    if (!apiKey && typeof process !== 'undefined' && process.env?.API_KEY) {
      apiKey = process.env.API_KEY;
    }
  } else if (provider === 'openrouter') {
    apiKey = storageService.getOpenRouterKey() || '';
  } else if (provider === 'openai') {
    apiKey = storageService.getOpenAIKey() || '';
  }

  return { provider, apiKey, model };
}

export function getDefaultModel(provider: AIProviderType): string {
  if (provider === 'openrouter') return 'deepseek/deepseek-v3.2';
  if (provider === 'openai') return 'gpt-5.2';
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
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return response.ok;
    }

    // ★ v3.0: OpenAI validation — test with /v1/models endpoint
    if (provider === 'openai') {
      if (!apiKey.startsWith('sk-') || apiKey.length < 20) return false;
      const response = await fetch('https://api.openai.com/v1/models', {
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
  if (config.provider === 'openai') {
    return config.apiKey.startsWith('sk-') && config.apiKey.length >= 20;
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

  if (config.provider === 'openai') {
    return generateWithOpenAI(config, options);
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
    throw e;
  }
}

// ─── OPENROUTER ADAPTER ─────────────────────────────────────────

async function generateWithOpenRouter(config: AIProviderConfig, options: AIGenerateOptions): Promise<AIGenerateResult> {
  const messages: any[] = [
    { role: 'user', content: options.prompt }
  ];

  if (options.jsonSchema || options.jsonMode) {
    messages.unshift({
      role: 'system',
      content: OPENROUTER_SYSTEM_PROMPT
    });
  }

  const maxTokens = getMaxTokensForSection(options.sectionKey);

  const body: any = {
    model: config.model,
    messages: messages,
    max_tokens: maxTokens,
  };

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

      if (response.status === 401 || response.status === 403) throw new Error('MISSING_API_KEY');
      if (response.status === 429) throw new Error(`RATE_LIMIT|openrouter|Rate limit reached for model ${config.model}. ${errorMsg}`);
      if (response.status === 402) throw new Error(`INSUFFICIENT_CREDITS|openrouter|Requested ${maxTokens} tokens for "${options.sectionKey || 'unknown'}". ${errorMsg}`);
      if (response.status === 503) throw new Error(`MODEL_OVERLOADED|openrouter|Model ${config.model} is temporarily unavailable. ${errorMsg}`);
      if (response.status === 500 || response.status === 502) throw new Error(`SERVER_ERROR|openrouter|${errorMsg}`);
            if (response.status === 408) throw new Error(`TIMEOUT|openrouter|Request timed out. ${errorMsg}`);
      throw new Error(`UNKNOWN_ERROR|openrouter|HTTP ${response.status}: ${errorMsg}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';

    if (!text) {
      throw new Error('OpenRouter returned empty response');
    }

    return { text };
  } catch (e: any) {
    if (e.message === 'MISSING_API_KEY' ||
        e.message?.startsWith('RATE_LIMIT|') ||
        e.message?.startsWith('INSUFFICIENT_CREDITS|') ||
        e.message?.startsWith('MODEL_OVERLOADED|') ||
        e.message?.startsWith('SERVER_ERROR|') ||
        e.message?.startsWith('TIMEOUT|') ||
        e.message?.startsWith('NETWORK_ERROR|') ||
        e.message?.startsWith('CONTENT_BLOCKED|') ||
        e.message?.startsWith('CONTEXT_TOO_LONG|') ||
        e.message?.startsWith('INVALID_JSON|') ||
        e.message?.startsWith('UNKNOWN_ERROR|')) {
      throw e;
    }
    handleProviderError(e, 'openrouter');
    throw e;
  }
}

// ─── ★ v3.0: OPENAI ADAPTER ─────────────────────────────────────

async function generateWithOpenAI(config: AIProviderConfig, options: AIGenerateOptions): Promise<AIGenerateResult> {
  const messages: any[] = [];

  // System prompt for JSON mode
  if (options.jsonSchema || options.jsonMode) {
    messages.push({
      role: 'system',
      content: OPENROUTER_SYSTEM_PROMPT  // Same structured JSON instructions work for OpenAI
    });
  }

  messages.push({ role: 'user', content: options.prompt });

  const maxTokens = getMaxTokensForSection(options.sectionKey);

  const body: any = {
    model: config.model,
    messages: messages,
    max_completion_tokens: maxTokens,
  };

  if (options.jsonSchema || options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;

      if (response.status === 401 || response.status === 403) throw new Error('MISSING_API_KEY');
      if (response.status === 429) throw new Error(`RATE_LIMIT|openai|Rate limit reached for model ${config.model}. ${errorMsg}`);
      if (response.status === 402) throw new Error(`INSUFFICIENT_CREDITS|openai|${errorMsg}`);
      if (response.status === 503) throw new Error(`MODEL_OVERLOADED|openai|Model ${config.model} is temporarily unavailable. ${errorMsg}`);
      if (response.status === 500 || response.status === 502) throw new Error(`SERVER_ERROR|openai|${errorMsg}`);
      if (response.status === 408) throw new Error(`TIMEOUT|openai|Request timed out. ${errorMsg}`);
      throw new Error(`UNKNOWN_ERROR|openai|HTTP ${response.status}: ${errorMsg}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';

    if (!text) {
      throw new Error('OpenAI returned empty response');
    }

    return { text };
  } catch (e: any) {
    if (e.message === 'MISSING_API_KEY' ||
        e.message?.startsWith('RATE_LIMIT|') ||
        e.message?.startsWith('INSUFFICIENT_CREDITS|') ||
        e.message?.startsWith('MODEL_OVERLOADED|') ||
        e.message?.startsWith('SERVER_ERROR|') ||
        e.message?.startsWith('TIMEOUT|') ||
        e.message?.startsWith('NETWORK_ERROR|') ||
        e.message?.startsWith('CONTENT_BLOCKED|') ||
        e.message?.startsWith('CONTEXT_TOO_LONG|') ||
        e.message?.startsWith('INVALID_JSON|') ||
        e.message?.startsWith('UNKNOWN_ERROR|')) {
      throw e;
    }
    handleProviderError(e, 'openai');
    throw e;
  }
}

// ─── ERROR HANDLING ──────────────────────────────────────────────
// (ostane IDENTIČNO kot v v2.0 — brez sprememb)

function handleProviderError(e: any, provider: string): never {
  const msg = e.message || e.toString();
  const msgLower = msg.toLowerCase();

  if (msg === 'MISSING_API_KEY' || msgLower.includes('api key not valid') ||
      msg.includes('401') || msg.includes('403') ||
      (msg.includes('400') && (msgLower.includes('key') || msgLower.includes('auth')))) {
    throw new Error('MISSING_API_KEY');
  }
  if (msg.includes('429') || msgLower.includes('quota') ||
      msgLower.includes('resource_exhausted') || msgLower.includes('rate limit') ||
      msgLower.includes('too many requests')) {
    throw new Error(`RATE_LIMIT|${provider}|${msg.substring(0, 200)}`);
  }
  if (msg.includes('402') || msgLower.includes('credits') ||
      msgLower.includes('insufficient') || msgLower.includes('afford') ||
      msgLower.includes('payment required') || msgLower.includes('billing')) {
    throw new Error(`INSUFFICIENT_CREDITS|${provider}|${msg.substring(0, 200)}`);
  }
  if (msg.includes('503') || msgLower.includes('unavailable') ||
      msgLower.includes('overloaded') || msgLower.includes('high demand') ||
      msgLower.includes('capacity') || msgLower.includes('temporarily')) {
    throw new Error(`MODEL_OVERLOADED|${provider}|${msg.substring(0, 200)}`);
  }
  if (msg.includes('500') || msg.includes('502') ||
      msgLower.includes('internal server error') || msgLower.includes('bad gateway')) {
    throw new Error(`SERVER_ERROR|${provider}|${msg.substring(0, 200)}`);
  }
  if (msg.includes('408') || msgLower.includes('timeout') ||
      msgLower.includes('etimedout') || msgLower.includes('econnaborted') ||
      msgLower.includes('deadline exceeded')) {
    throw new Error(`TIMEOUT|${provider}|${msg.substring(0, 200)}`);
  }
  if (msgLower.includes('fetch') || msgLower.includes('network') ||
      msgLower.includes('failed to fetch') || msgLower.includes('err_') ||
      msgLower.includes('enotfound') || msgLower.includes('econnrefused') ||
      msgLower.includes('cors')) {
    throw new Error(`NETWORK_ERROR|${provider}|${msg.substring(0, 200)}`);
  }
  if (msgLower.includes('safety') || msgLower.includes('blocked') ||
      msgLower.includes('content filter') || msgLower.includes('harmful') ||
      msgLower.includes('recitation')) {
    throw new Error(`CONTENT_BLOCKED|${provider}|${msg.substring(0, 200)}`);
  }
  if (msgLower.includes('context length') || msgLower.includes('too long') ||
      msgLower.includes('token limit') || msgLower.includes('max.*token')) {
    throw new Error(`CONTEXT_TOO_LONG|${provider}|${msg.substring(0, 200)}`);
  }
  if (msgLower.includes('json') || msgLower.includes('unexpected token') ||
      msgLower.includes('parse error') || msgLower.includes('invalid json')) {
    throw new Error(`INVALID_JSON|${provider}|${msg.substring(0, 200)}`);
  }

  console.error(`[${provider}] Unclassified API Error:`, e);
  throw new Error(`UNKNOWN_ERROR|${provider}|${msg.substring(0, 200)}`);
}
