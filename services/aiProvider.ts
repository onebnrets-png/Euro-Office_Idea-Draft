// services/aiProvider.ts
// ═══════════════════════════════════════════════════════════════
// Universal AI Provider Abstraction Layer – v5.6 (2026-03-01)
// ═══════════════════════════════════════════════════════════════
// CHANGELOG:
// v5.6 – FIX: Added INVALID_JSON to RETRYABLE_ERRORS — AI sometimes returns malformed JSON
//         which is a transient issue (retry usually succeeds). Affects ALL AI calls globally.
// v5.5 – NEW: AbortSignal support for generation cancellation
//         - AIGenerateOptions: added signal?: AbortSignal
//         - withRetry: checks signal.aborted before each attempt
//         - generateWithOpenRouter: passes signal to fetch()
//         - generateWithOpenAI: passes signal to fetch()
//         - generateWithGemini: checks signal.aborted before call
//         - handleProviderError: recognizes AbortError
//         CHANGED: LIGHT_MODEL_TASKS expanded with 'allocation', 'summary'
// v5.0 – NEW: Smart AI credit protection system
//         - Client-side rate limiter (configurable per-minute cap)
//         - Retry with exponential backoff (RATE_LIMIT, SERVER_ERROR, TIMEOUT)
//         - Global request queue with concurrency limit
//         - Usage event emitter (aiUsageEvent) for tracking
//         - Cooldown enforcement between rapid calls
//         - All protection is transparent — callers unchanged
// v4.0 – NEW: Dual-model support (primary + light model)
//         Added AITaskType, getProviderConfigForTask(),
//         RECOMMENDED_LIGHT_MODELS, generateContentForTask()
//         Existing generateContent() unchanged (backward compat)
// v3.0 – NEW: OpenAI (ChatGPT) provider support
// v2.0 – FIX: Dynamic max_tokens for OpenRouter
// v1.0 – Initial version.
// ═══════════════════════════════════════════════════════════════

import { GoogleGenAI, Type } from "@google/genai";
import { storageService } from './storageService.ts';
import { OPENROUTER_SYSTEM_PROMPT } from './Instructions.ts';

// ═══════════════════════════════════════════════════════════════
// ★ v5.0: SMART AI CREDIT PROTECTION SYSTEM
// ═══════════════════════════════════════════════════════════════

// ─── Rate Limiter — sliding window per-minute cap ────────────────

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 14;
const MIN_COOLDOWN_MS = 1_500;

const requestTimestamps: number[] = [];
let lastRequestTime = 0;

function checkClientRateLimit(): { allowed: boolean; waitMs: number; reason: string } {
  const now = Date.now();

  const sinceLast = now - lastRequestTime;
  if (sinceLast < MIN_COOLDOWN_MS) {
    return { allowed: false, waitMs: MIN_COOLDOWN_MS - sinceLast, reason: 'cooldown' };
  }

  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestInWindow = requestTimestamps[0];
    const waitMs = oldestInWindow + RATE_LIMIT_WINDOW_MS - now + 500;
    return { allowed: false, waitMs: Math.max(waitMs, 1000), reason: 'window_full' };
  }

  return { allowed: true, waitMs: 0, reason: '' };
}

function recordRequest(): void {
  const now = Date.now();
  requestTimestamps.push(now);
  lastRequestTime = now;
}

// ─── Retry with exponential backoff ──────────────────────────────

const RETRYABLE_ERRORS = new Set(['RATE_LIMIT', 'SERVER_ERROR', 'TIMEOUT', 'MODEL_OVERLOADED']);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2_000;

async function withRetry<T>(
  fn: () => Promise<T>,
  context: string = '',
  signal?: AbortSignal  // ★ v5.5: AbortSignal
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // ★ v5.5: Check abort before each attempt
    if (signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

    try {
      const rateCheck = checkClientRateLimit();
      if (!rateCheck.allowed) {
        console.log(`[aiProvider] Rate limit (${rateCheck.reason}): waiting ${rateCheck.waitMs}ms before ${context || 'request'}`);
        await sleep(rateCheck.waitMs);
      }

      // ★ v5.5: Check abort after rate limit wait
      if (signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

      recordRequest();
      return await fn();
    } catch (e: any) {
      lastError = e;

      // ★ v5.5: Don't retry if aborted
      if (e.name === 'AbortError') throw e;

      const errorCode = (e.message || '').split('|')[0];

      if (!RETRYABLE_ERRORS.has(errorCode)) {
        throw e;
      }

      if (attempt >= MAX_RETRIES) {
        console.warn(`[aiProvider] All ${MAX_RETRIES} retries exhausted for ${context}: ${errorCode}`);
        throw e;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.log(`[aiProvider] Retry ${attempt + 1}/${MAX_RETRIES} for ${context} (${errorCode}) — waiting ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Global concurrency queue ────────────────────────────────────

const MAX_CONCURRENT = 2;
let activeRequests = 0;
const pendingQueue: Array<{ resolve: () => void }> = [];

async function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    return;
  }
  return new Promise<void>((resolve) => {
    pendingQueue.push({ resolve });
  });
}

function releaseSlot(): void {
  activeRequests--;
  if (pendingQueue.length > 0 && activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    const next = pendingQueue.shift()!;
    next.resolve();
  }
}

// ─── Usage event emitter ─────────────────────────────────────────

export interface AIUsageEvent {
  timestamp: number;
  provider: string;
  model: string;
  taskType: string;
  sectionKey: string;
  success: boolean;
  durationMs: number;
  errorCode?: string;
}

type AIUsageListener = (event: AIUsageEvent) => void;
const usageListeners: AIUsageListener[] = [];

export function onAIUsage(listener: AIUsageListener): () => void {
  usageListeners.push(listener);
  return () => {
    const idx = usageListeners.indexOf(listener);
    if (idx >= 0) usageListeners.splice(idx, 1);
  };
}

function emitUsageEvent(event: AIUsageEvent): void {
  for (const listener of usageListeners) {
    try { listener(event); } catch (e) { console.warn('[aiProvider] Usage listener error:', e); }
  }
}

// ─── Public: get current rate limit status ───────────────────────

export function getRateLimitStatus(): {
  requestsInWindow: number;
  maxRequests: number;
  windowMs: number;
  cooldownMs: number;
  cooldownRemaining: number;
  activeRequests: number;
  queuedRequests: number;
} {
  const now = Date.now();
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift();
  }
  return {
    requestsInWindow: requestTimestamps.length,
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
    cooldownMs: MIN_COOLDOWN_MS,
    cooldownRemaining: Math.max(0, MIN_COOLDOWN_MS - (now - lastRequestTime)),
    activeRequests,
    queuedRequests: pendingQueue.length,
  };
}

// ─── TYPES ───────────────────────────────────────────────────────

export type AIProviderType = 'gemini' | 'openrouter' | 'openai';

export type AITaskType = 'generation' | 'translation' | 'chatbot' | 'field' | 'allocation' | 'summary';

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey: string;
  model: string;
}

// ★ v5.5: Added signal?: AbortSignal
export interface AIGenerateOptions {
  prompt: string;
  jsonSchema?: any;
  jsonMode?: boolean;
  temperature?: number;
  sectionKey?: string;
  taskType?: AITaskType;
  signal?: AbortSignal;
}

export interface AIGenerateResult {
  text: string;
}

// ─── ★ v4.0: RECOMMENDED LIGHT MODELS PER PROVIDER ──────────────

export const RECOMMENDED_LIGHT_MODELS: Record<AIProviderType, { id: string; name: string }> = {
  gemini:     { id: 'gemini-2.5-flash-lite',  name: 'Gemini 2.5 Flash-Lite ($0.10/1M)' },
  openai:     { id: 'gpt-4.1-nano',           name: 'GPT-4.1 Nano ($0.05/1M)' },
  openrouter: { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2 (~$0.14/1M)' },
};

// ★ v5.5: Added 'allocation' and 'summary'
const LIGHT_MODEL_TASKS: Set<AITaskType> = new Set([
  'translation', 'chatbot', 'field', 'allocation', 'summary'
]);

// ─── DYNAMIC MAX_TOKENS PER SECTION ──────────────────────────────

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
  partnerAllocations:  8192,  // ★ v5.5: Added for partner allocations
  chartExtraction:     1024,   // ★ NEW: Low token budget for data extraction
};

const DEFAULT_MAX_TOKENS = 4096;

function getMaxTokensForSection(sectionKey?: string): number {
  if (!sectionKey) return DEFAULT_MAX_TOKENS;
  return SECTION_MAX_TOKENS[sectionKey] || DEFAULT_MAX_TOKENS;
}

// ─── GEMINI MODELS ───────────────────────────────────────────────

export const GEMINI_MODELS = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)', description: 'Most advanced — complex reasoning, coding, multimodal' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', description: 'Next-gen speed — agentic workflows, balanced quality' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Stable) ★ Primary', description: 'Deep reasoning, coding, complex tasks — 1M context' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Stable)', description: 'Best price-performance — fast, high volume, thinking' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite (Stable) ★ Light', description: 'Cheapest — ideal for chatbot, translations, field fills' },
];

// ─── OPENAI MODELS ───────────────────────────────────────────────

export const OPENAI_MODELS = [
  { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Best model — coding, agentic tasks, reasoning' },
  { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', description: 'Smarter, more precise responses — higher cost' },
  { id: 'gpt-5.1', name: 'GPT-5.1', description: 'Coding and agentic tasks — configurable reasoning' },
  { id: 'gpt-5', name: 'GPT-5', description: 'Intelligent reasoning — complex tasks' },
  { id: 'gpt-5-pro', name: 'GPT-5 Pro', description: 'Enhanced GPT-5 — more precise' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini ★ Primary', description: 'Faster, cost-efficient GPT-5 variant' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Cheapest GPT-5 — fast, lightweight tasks' },
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Smartest non-reasoning model — still in API' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Smaller, faster GPT-4.1' },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano ★ Light', description: 'Cheapest — ideal for chatbot, translations, field fills' },
  { id: 'o3', name: 'o3', description: 'Reasoning model — complex analytical tasks' },
  { id: 'o3-pro', name: 'o3 Pro', description: 'Enhanced o3 — more compute, better answers' },
  { id: 'o3-mini', name: 'o3 Mini', description: 'Small reasoning model — fast, affordable' },
];

// ─── OPENROUTER POPULAR MODELS ───────────────────────────────────

export const OPENROUTER_MODELS = [
  { id: 'openai/gpt-5.2', name: 'OpenAI GPT-5.2', description: 'Latest OpenAI flagship' },
  { id: 'openai/gpt-5-mini', name: 'OpenAI GPT-5 Mini', description: 'Fast, cost-efficient reasoning' },
  { id: 'openai/gpt-4.1', name: 'OpenAI GPT-4.1', description: 'Smartest non-reasoning model' },
  { id: 'openai/gpt-4.1-nano', name: 'OpenAI GPT-4.1 Nano', description: 'Ultra cheap OpenAI' },
  { id: 'openai/o3-mini', name: 'OpenAI o3-mini', description: 'OpenAI reasoning model' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Anthropic balanced model' },
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', description: 'Anthropic most capable' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro (via OpenRouter)', description: 'Google flagship via OpenRouter' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (via OpenRouter)', description: 'Google fast model via OpenRouter' },
  { id: 'deepseek/deepseek-v3.2', name: '🇨🇳 DeepSeek V3.2 ★ Primary & Light', description: 'Flagship open-source — MoE 671B, top quality, cheapest via OpenRouter' },
  { id: 'deepseek/deepseek-r1', name: '🇨🇳 DeepSeek R1', description: 'Reasoning model — rivals OpenAI o1' },
  { id: 'deepseek/deepseek-r1-0528', name: '🇨🇳 DeepSeek R1 0528', description: 'Latest R1 — enhanced reasoning' },
  { id: 'moonshotai/kimi-k2.5', name: '🇨🇳 Kimi K2.5 (Moonshot)', description: '#1 open-source — reasoning + visual coding' },
  { id: 'moonshotai/kimi-k2', name: '🇨🇳 Kimi K2 (Moonshot)', description: '1T param MoE — coding & agentic tasks' },
  { id: 'qwen/qwen3-235b-a22b', name: '🇨🇳 Qwen3 235B (Alibaba)', description: 'Alibaba MoE 235B — top reasoning & coding' },
  { id: 'qwen/qwen3-max', name: '🇨🇳 Qwen3 Max (Alibaba)', description: 'Alibaba cloud flagship' },
  { id: 'qwen/qwen3-coder', name: '🇨🇳 Qwen3 Coder (Alibaba)', description: 'Alibaba coding specialist — 480B MoE' },
  { id: 'minimax/minimax-m2.1', name: '🇨🇳 MiniMax M2.1', description: 'MiniMax flagship — coding & agents' },
  { id: 'z-ai/glm-5', name: '🇨🇳 GLM-5 (Zhipu)', description: 'Zhipu frontier open-source' },
  { id: 'meta-llama/llama-4-maverick', name: '🦙 Llama 4 Maverick', description: 'Meta MoE 128 experts — top Llama' },
  { id: 'meta-llama/llama-4-scout', name: '🦙 Llama 4 Scout', description: 'Meta MoE 16 experts — fast & efficient' },
  { id: 'mistralai/mistral-large-2512', name: '🇫🇷 Mistral Large 3', description: 'Mistral flagship — 262K context' },
  { id: 'mistralai/devstral-2512', name: '🇫🇷 Devstral 2 (Mistral)', description: 'Agentic coding specialist — 123B MoE' },
  { id: 'mistralai/mistral-small-2503', name: '🇫🇷 Mistral Small', description: 'Lightweight — fast responses' },
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

export function getProviderConfigForTask(taskType?: AITaskType): AIProviderConfig {
  const baseConfig = getProviderConfig();

  if (!taskType || !LIGHT_MODEL_TASKS.has(taskType)) {
    return baseConfig;
  }

  const secondaryModel = storageService.getSecondaryModel();

  if (secondaryModel && secondaryModel.trim() !== '') {
    return { ...baseConfig, model: secondaryModel };
  }

  return baseConfig;
}

export function getDefaultModel(provider: AIProviderType): string {
  if (provider === 'openrouter') return 'deepseek/deepseek-v3.2';
  if (provider === 'openai') return 'gpt-5.2';
  return 'gemini-3-pro-preview';
}

export function getModelsForProvider(provider: AIProviderType): { id: string; name: string; description: string }[] {
  if (provider === 'gemini') return GEMINI_MODELS;
  if (provider === 'openai') return OPENAI_MODELS;
  if (provider === 'openrouter') return OPENROUTER_MODELS;
  return [];
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
// ★ v5.0: Wrapped with retry, queue, rate limiting, and usage tracking
// ★ v5.5: AbortSignal forwarded to withRetry and provider functions

export async function generateContent(options: AIGenerateOptions): Promise<AIGenerateResult> {
  // ★ v5.5: Check abort before anything
  if (options.signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

  const config = options.taskType
    ? getProviderConfigForTask(options.taskType)
    : getProviderConfig();

  if (!config.apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const context = `${options.taskType || 'default'}:${options.sectionKey || 'unknown'}`;
  console.log(`[aiProvider] ${context} → model: ${config.model}`);

  // ★ v5.0: Acquire concurrency slot
  await acquireSlot();
  const startTime = Date.now();

  try {
    // ★ v5.0/v5.5: Wrap actual call with retry logic + signal
    const result = await withRetry(async () => {
      // ★ v5.5: Check abort before each provider call
      if (options.signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

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
    }, context, options.signal);

    // ★ v5.0: Emit success usage event
    emitUsageEvent({
      timestamp: Date.now(),
      provider: config.provider,
      model: config.model,
      taskType: options.taskType || 'default',
      sectionKey: options.sectionKey || 'unknown',
      success: true,
      durationMs: Date.now() - startTime,
    });

    return result;
  } catch (e: any) {
    // ★ v5.5: Don't emit usage event for abort — it's user-initiated
    if (e.name === 'AbortError') throw e;

    // ★ v5.0: Emit failure usage event
    const errorCode = (e.message || '').split('|')[0];
    emitUsageEvent({
      timestamp: Date.now(),
      provider: config.provider,
      model: config.model,
      taskType: options.taskType || 'default',
      sectionKey: options.sectionKey || 'unknown',
      success: false,
      durationMs: Date.now() - startTime,
      errorCode,
    });
    throw e;
  } finally {
    // ★ v5.0: Always release concurrency slot
    releaseSlot();
  }
}

// ─── GEMINI ADAPTER ──────────────────────────────────────────────
// ★ v5.5: Checks signal.aborted before API call

async function generateWithGemini(config: AIProviderConfig, options: AIGenerateOptions): Promise<AIGenerateResult> {
  // ★ v5.5: Check abort before Gemini call (SDK doesn't support signal natively)
  if (options.signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

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
    // ★ v5.5: Re-throw AbortError without classification
    if (e.name === 'AbortError') throw e;
    handleProviderError(e, 'gemini');
    throw e;
  }
}

// ─── OPENROUTER ADAPTER ─────────────────────────────────────────
// ★ v5.5: Passes signal to fetch()

async function generateWithOpenRouter(config: AIProviderConfig, options: AIGenerateOptions): Promise<AIGenerateResult> {
  // ★ v5.5: Check abort before fetch
  if (options.signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

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
      body: JSON.stringify(body),
      signal: options.signal,  // ★ v5.5: AbortSignal
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
    // ★ v5.5: Re-throw AbortError without classification
    if (e.name === 'AbortError') throw e;

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

// ─── OPENAI ADAPTER ──────────────────────────────────────────────
// ★ v5.5: Passes signal to fetch()

async function generateWithOpenAI(config: AIProviderConfig, options: AIGenerateOptions): Promise<AIGenerateResult> {
  // ★ v5.5: Check abort before fetch
  if (options.signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');

  const messages: any[] = [];

  if (options.jsonSchema || options.jsonMode) {
    messages.push({
      role: 'system',
      content: OPENROUTER_SYSTEM_PROMPT
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
      body: JSON.stringify(body),
      signal: options.signal,  // ★ v5.5: AbortSignal
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
    // ★ v5.5: Re-throw AbortError without classification
    if (e.name === 'AbortError') throw e;

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
// ★ v5.5: Added AbortError recognition at the top

function handleProviderError(e: any, provider: string): never {
  const msg = e.message || e.toString();
  const msgLower = msg.toLowerCase();

  // ★ v5.5: AbortError — user cancelled generation
  if (e.name === 'AbortError' || msgLower.includes('abort') || msgLower.includes('cancelled') || msgLower.includes('generation cancelled')) {
    throw new DOMException('Generation cancelled', 'AbortError');
  }

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
