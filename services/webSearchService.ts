// services/webSearchService.ts
// ═══════════════════════════════════════════════════════════════
// Web Search Service for evidence-based content generation
// v1.0 — 2026-03-06 — EO-042: Serper API integration
//
// ARCHITECTURE:
//   - Uses Serper.dev Google Search API (https://serper.dev)
//   - API key stored in user_settings.web_search_key (Supabase)
//   - Enabled/disabled via user_settings.web_search_enabled
//   - Called by geminiService.ts BEFORE prompt building
//   - Results injected as verified context block into AI prompt
//   - Cache: 5-minute TTL per query to avoid redundant API calls
// ═══════════════════════════════════════════════════════════════

import { storageService } from './storageService.ts';

// ─── TYPES ───────────────────────────────────────────────────

export interface WebSearchResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source?: string;
}

export interface WebSearchResponse {
  results: WebSearchResult[];
  query: string;
  timestamp: number;
}

// ─── CACHE ───────────────────────────────────────────────────

var _searchCache: Record<string, WebSearchResponse> = {};
var CACHE_TTL = 300000; // 5 minutes

function getCacheKey(query: string): string {
  return query.toLowerCase().trim();
}

function getCachedResult(query: string): WebSearchResponse | null {
  var key = getCacheKey(query);
  var cached = _searchCache[key];
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('[WebSearch] Cache HIT for: ' + query.substring(0, 60));
    return cached;
  }
  return null;
}

function setCachedResult(query: string, response: WebSearchResponse): void {
  var key = getCacheKey(query);
  _searchCache[key] = response;
  // Prune old entries if cache grows too large
  var keys = Object.keys(_searchCache);
  if (keys.length > 50) {
    var now = Date.now();
    for (var i = 0; i < keys.length; i++) {
      if (now - _searchCache[keys[i]].timestamp > CACHE_TTL) {
        delete _searchCache[keys[i]];
      }
    }
  }
}

// ─── SERPER API ──────────────────────────────────────────────

async function serperSearch(query: string, apiKey: string, numResults: number): Promise<WebSearchResult[]> {
  var response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      num: numResults,
      gl: 'eu',
    }),
  });

  if (!response.ok) {
    var errorText = await response.text().catch(function() { return 'Unknown error'; });
    console.error('[WebSearch] Serper API error: ' + response.status + ' ' + errorText);
    if (response.status === 401 || response.status === 403) {
      throw new Error('WEB_SEARCH_INVALID_KEY');
    }
    if (response.status === 429) {
      throw new Error('WEB_SEARCH_RATE_LIMIT');
    }
    throw new Error('WEB_SEARCH_API_ERROR|' + response.status);
  }

  var data = await response.json();
  var results: WebSearchResult[] = [];

  if (data.organic && Array.isArray(data.organic)) {
    for (var i = 0; i < data.organic.length; i++) {
      var item = data.organic[i];
      results.push({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
        date: item.date || '',
        source: item.source || '',
      });
    }
  }

  // Also include knowledge graph if available
  if (data.knowledgeGraph && data.knowledgeGraph.description) {
    results.unshift({
      title: data.knowledgeGraph.title || 'Knowledge Graph',
      link: data.knowledgeGraph.website || '',
      snippet: data.knowledgeGraph.description,
      source: 'Google Knowledge Graph',
    });
  }

  return results;
}

// ─── QUERY BUILDER ───────────────────────────────────────────

function buildSearchQueries(topic: string, region: string, language: string): string[] {
  var queries: string[] = [];
  var regionStr = region ? ' ' + region : '';
  var langHint = language === 'si' ? ' Slovenia' : '';

  // Primary: topic + region + statistics
  queries.push(topic + regionStr + langHint + ' statistics data');

  // Secondary: topic + EU policy/framework
  queries.push(topic + ' EU policy framework empirical evidence');

  // Tertiary: topic + recent research
  queries.push(topic + regionStr + ' research study results');

  return queries;
}

// ─── PUBLIC API ──────────────────────────────────────────────

/**
 * Check if web search is available (key exists + enabled)
 */
export function isWebSearchAvailable(): boolean {
  var settings = storageService.getCachedSettings();
  if (!settings) return false;
  var hasKey = settings.web_search_key && typeof settings.web_search_key === 'string' && settings.web_search_key.trim().length > 10;
  var isEnabled = settings.web_search_enabled === true;
  return hasKey && isEnabled;
}

/**
 * Get the web search API key from cached settings
 */
export function getWebSearchApiKey(): string {
  var settings = storageService.getCachedSettings();
  if (!settings || !settings.web_search_key) return '';
  return settings.web_search_key.trim();
}

/**
 * Search for evidence on a topic. Returns formatted results.
 * Called by geminiService before prompt building.
 *
 * @param topic - Main topic/problem to search for
 * @param region - Geographic region (e.g., "Slovenia", "Western Balkans")
 * @param language - Target language ('en' or 'si')
 * @returns Array of search results, or empty array if unavailable
 */
export async function searchForEvidence(
  topic: string,
  region: string,
  language: string
): Promise<WebSearchResult[]> {
  if (!isWebSearchAvailable()) {
    return [];
  }

  var apiKey = getWebSearchApiKey();
  if (!apiKey) return [];

  // Build search queries
  var queries = buildSearchQueries(topic, region, language);
  var allResults: WebSearchResult[] = [];
  var seenLinks = new Set<string>();

  for (var qi = 0; qi < queries.length; qi++) {
    var query = queries[qi];

    // Check cache first
    var cached = getCachedResult(query);
    if (cached) {
      for (var ci = 0; ci < cached.results.length; ci++) {
        if (!seenLinks.has(cached.results[ci].link)) {
          seenLinks.add(cached.results[ci].link);
          allResults.push(cached.results[ci]);
        }
      }
      continue;
    }

    try {
      var results = await serperSearch(query, apiKey, 5);

      // Cache the result
      setCachedResult(query, {
        results: results,
        query: query,
        timestamp: Date.now(),
      });

      // Deduplicate
      for (var ri = 0; ri < results.length; ri++) {
        if (!seenLinks.has(results[ri].link)) {
          seenLinks.add(results[ri].link);
          allResults.push(results[ri]);
        }
      }

      // Small delay between queries to be respectful
      if (qi < queries.length - 1) {
        await new Promise(function(r) { setTimeout(r, 300); });
      }
    } catch (e: any) {
      console.warn('[WebSearch] Query failed: ' + query, e.message || e);
      // Don't throw — partial results are better than none
      break;
    }
  }

  // Limit total results
  if (allResults.length > 12) {
    allResults = allResults.slice(0, 12);
  }

  console.log('[WebSearch] Found ' + allResults.length + ' results for topic: ' + topic.substring(0, 50));
  return allResults;
}

/**
 * Format search results into a prompt block for AI injection.
 * This block goes BEFORE the main prompt in geminiService.
 */
export function formatSearchResultsForPrompt(results: WebSearchResult[]): string {
  if (!results || results.length === 0) return '';

  var lines: string[] = [];
  lines.push('=== VERIFIED WEB SEARCH RESULTS (USE AS PRIMARY EVIDENCE) ===');
  lines.push('The following are REAL search results from the internet. Use these as');
  lines.push('primary evidence sources when generating content. Cite them properly.');
  lines.push('Prefer these over your training data when they provide more specific');
  lines.push('or more recent information.');
  lines.push('');

  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    lines.push('--- Result ' + (i + 1) + ' ---');
    lines.push('Title: ' + r.title);
    if (r.link) lines.push('URL: ' + r.link);
    if (r.date) lines.push('Date: ' + r.date);
    if (r.source) lines.push('Source: ' + r.source);
    lines.push('Excerpt: ' + r.snippet);
    lines.push('');
  }

  lines.push('=== END OF WEB SEARCH RESULTS ===');
  lines.push('INSTRUCTIONS: Integrate the above data into your response with proper');
  lines.push('citations. If a search result provides a specific number or statistic,');
  lines.push('USE IT with attribution. Do NOT ignore these results.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Extract a search topic from project data for a given section.
 * Used by geminiService to determine WHAT to search for.
 */
export function extractSearchTopic(sectionKey: string, projectData: any): { topic: string; region: string } {
  var topic = '';
  var region = '';

  // Extract core problem as main topic
  var cp = projectData.problemAnalysis?.coreProblem;
  if (cp) {
    topic = cp.title || cp.description || '';
    if (topic.length > 150) topic = topic.substring(0, 150);
  }

  // If no core problem, try project title or main aim
  if (!topic || topic.trim().length < 10) {
    topic = projectData.projectIdea?.projectTitle
      || projectData.projectIdea?.mainAim
      || '';
    if (topic.length > 150) topic = topic.substring(0, 150);
  }

  // Section-specific refinement
  if (sectionKey === 'stateOfTheArt' || sectionKey === 'proposedSolution') {
    var piTopic = projectData.projectIdea?.mainAim || projectData.projectIdea?.projectTitle || '';
    if (piTopic) topic = piTopic.substring(0, 150);
  }

  if (sectionKey === 'policies') {
    topic = topic + ' EU policy framework directive regulation';
  }

  // Extract region from project data
  // Look for country/region mentions in the problem analysis or project idea
  var textToScan = (cp?.description || '') + ' ' + (projectData.projectIdea?.proposedSolution || '');
  var regionPatterns = [
    /\b(Slovenia|Slovenija)\b/i,
    /\b(Croatia|Hrvatska)\b/i,
    /\b(Austria|Österreich)\b/i,
    /\b(Western Balkans|Zahodni Balkan)\b/i,
    /\b(Danube Region|Podonavje)\b/i,
    /\b(Alpine Region|Alpski prostor)\b/i,
    /\b(Central Europe|Srednja Evropa)\b/i,
    /\b(Mediterranean|Sredozemlje)\b/i,
  ];

  for (var pi = 0; pi < regionPatterns.length; pi++) {
    var match = textToScan.match(regionPatterns[pi]);
    if (match) {
      region = match[1];
      break;
    }
  }

  return { topic: topic.trim(), region: region };
}
