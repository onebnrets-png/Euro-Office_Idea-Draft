// components/InlineChart.tsx
// ═══════════════════════════════════════════════════════════════
// v1.3 — 2026-02-25 — Serialized queue + rate limit UI + cache fix
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { extractEmpiricalData, type ExtractedChartData } from '../services/DataExtractionService.ts';
import { resolveAllChartTypes } from '../services/ChartTypeResolver.ts';
import ChartRenderer from './ChartRenderer.tsx';
import { theme } from '../design/theme.ts';

// ─── Module-level cache ──────────────────────────────────────

const extractionCache = new Map<string, ExtractedChartData[]>();

const getTextHash = function (text: string): string {
  return text.substring(0, 100) + '__' + text.length;
};

// ─── Serialized queue ────────────────────────────────────────

interface QueueItem {
  text: string;
  fieldContext: string;
  resolve: (data: ExtractedChartData[]) => void;
  reject: (err: any) => void;
}

const extractionQueue: QueueItem[] = [];
let isProcessingQueue = false;
let queueRateLimited = false;

var enqueueExtraction = function (text: string, fieldContext: string): Promise<ExtractedChartData[]> {
  // If we already hit rate limit, reject immediately
  if (queueRateLimited) {
    return Promise.reject(new Error('RATE_LIMIT'));
  }
  return new Promise(function (resolve, reject) {
    extractionQueue.push({ text: text, fieldContext: fieldContext, resolve: resolve, reject: reject });
    if (!isProcessingQueue) {
      processQueue();
    }
  });
};

var processQueue = async function () {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (extractionQueue.length > 0) {
    var item = extractionQueue.shift();
    if (!item) break;

    console.log('[InlineChart] Queue processing: "' + item.fieldContext + '" (' + extractionQueue.length + ' remaining)');

    try {
      var result = await extractEmpiricalData(item.text, item.fieldContext);
      item.resolve(result);
    } catch (err: any) {
      var msg = (err && err.message) ? err.message : String(err);
      var isRateLimit = msg.indexOf('RATE_LIMIT') >= 0 || msg.indexOf('429') >= 0 || msg.indexOf('Quota') >= 0;

      console.warn('[InlineChart] Queue failed for "' + item.fieldContext + '":' + (isRateLimit ? ' RATE_LIMIT' : ' ' + msg));

      if (isRateLimit) {
        queueRateLimited = true;
        item.reject(new Error('RATE_LIMIT'));
        // Cancel all remaining
        console.warn('[InlineChart] RATE LIMIT — clearing queue (' + extractionQueue.length + ' items cancelled)');
        while (extractionQueue.length > 0) {
          var cancelled = extractionQueue.shift();
          if (cancelled) cancelled.reject(new Error('RATE_LIMIT'));
        }
        // Reset rate limit flag after 120s
        setTimeout(function () {
          queueRateLimited = false;
          console.log('[InlineChart] Rate limit cooldown expired — queue re-enabled');
        }, 120000);
        break;
      } else {
        item.reject(err);
      }
    }

    // Wait 8s between extractions
    if (extractionQueue.length > 0) {
      console.log('[InlineChart] Queue waiting 8s before next...');
      await new Promise(function (r) { setTimeout(r, 8000); });
    }
  }

  isProcessingQueue = false;
};

// ─── Props ───────────────────────────────────────────────────

interface InlineChartProps {
  text: string;
  fieldContext?: string;
  language?: 'en' | 'si';
  minTextLength?: number;
  maxCharts?: number;
}

// ─── Chart icon SVG ──────────────────────────────────────────

var ChartIcon = function (props: { size?: number; color?: string }) {
  var size = props.size || 16;
  var color = props.color;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="8" width="3" height="7" rx="0.5" fill={color || theme.colors.secondary[500]} opacity="0.8" />
      <rect x="5.5" y="4" width="3" height="11" rx="0.5" fill={color || theme.colors.primary[500]} opacity="0.8" />
      <rect x="10" y="1" width="3" height="14" rx="0.5" fill={color || theme.colors.success[500]} opacity="0.8" />
    </svg>
  );
};

// ─── Component ───────────────────────────────────────────────

var InlineChart = function (props: InlineChartProps) {
  var text = props.text;
  var fieldContext = props.fieldContext;
  var language = props.language || 'en';
  var minTextLength = props.minTextLength || 50;
  var maxCharts = props.maxCharts || 3;

  var chartsState = useState<ExtractedChartData[]>([]);
  var charts = chartsState[0];
  var setCharts = chartsState[1];

  var expandedState = useState(false);
  var isExpanded = expandedState[0];
  var setIsExpanded = expandedState[1];

  var loadingState = useState(false);
  var isLoading = loadingState[0];
  var setIsLoading = loadingState[1];

  var extractedState = useState(false);
  var hasExtracted = extractedState[0];
  var setHasExtracted = extractedState[1];

  var rateLimitState = useState(false);
  var rateLimitHit = rateLimitState[0];
  var setRateLimitHit = rateLimitState[1];

  var lastTextRef = useRef<string>('');
  var debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Extract data ─────────────────────────────────────────

  var doExtraction = useCallback(async function (currentText: string) {
    if (currentText.length < minTextLength) {
      setCharts([]);
      setHasExtracted(false);
      return;
    }

    var cacheKey = getTextHash(currentText);
    var cached = extractionCache.get(cacheKey);
    if (cached) {
      console.log('[InlineChart] Cache HIT for "' + (fieldContext || '') + '" (' + cached.length + ' charts)');
      setCharts(cached);
      setHasExtracted(true);
      setRateLimitHit(false);
      return;
    }

    setIsLoading(true);
    try {
      var extracted = await enqueueExtraction(currentText, fieldContext || '');
      var resolved = resolveAllChartTypes(extracted);
      var limited = resolved.slice(0, maxCharts);

      if (limited.length > 0) {
        extractionCache.set(cacheKey, limited);
        console.log('[InlineChart] Cache SET for "' + (fieldContext || '') + '" (' + limited.length + ' charts)');
        setRateLimitHit(false);
      } else {
        console.log('[InlineChart] Skip cache — 0 charts for "' + (fieldContext || '') + '"');
      }

      setCharts(limited);
      setHasExtracted(true);
    } catch (err: any) {
      console.warn('[InlineChart] Extraction failed:', err);
      var errMsg = (err && err.message) ? err.message : String(err);
      if (errMsg.indexOf('RATE_LIMIT') >= 0 || errMsg.indexOf('429') >= 0 || errMsg.indexOf('Quota') >= 0) {
        setRateLimitHit(true);
      }
      setCharts([]);
      setHasExtracted(true);
    } finally {
      setIsLoading(false);
    }
  }, [fieldContext, minTextLength, maxCharts]);

  // ─── Trigger extraction on text change ────────────────────

  useEffect(function () {
    var isRemount = lastTextRef.current === text && text.length > 0;

    if (isRemount) {
      if (text.length >= minTextLength) {
        var cacheKey = getTextHash(text);
        var cached = extractionCache.get(cacheKey);
        if (cached && cached.length > 0) {
          setCharts(cached);
          setHasExtracted(true);
          setRateLimitHit(false);
          return;
        }
      }
      lastTextRef.current = '';
    }

    if (text === lastTextRef.current) return;

    var lengthDiff = Math.abs(text.length - lastTextRef.current.length);
    var previousText = lastTextRef.current;
    lastTextRef.current = text;

    if (previousText === '' && text.length >= minTextLength) {
      var ck = getTextHash(text);
      var c = extractionCache.get(ck);
      if (c && c.length > 0) {
        setCharts(c);
        setHasExtracted(true);
        setRateLimitHit(false);
        return;
      }
    }

    if (hasExtracted && lengthDiff < 20) return;

    if (previousText && lengthDiff >= 20) {
      var oldKey = getTextHash(previousText);
      extractionCache.delete(oldKey);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(function () {
      doExtraction(text);
    }, 2000);

    return function () {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, doExtraction, hasExtracted, minTextLength, fieldContext]);

  // ─── Render ───────────────────────────────────────────────

  if (!hasExtracted && !isLoading && !rateLimitHit) return null;
  if (hasExtracted && charts.length === 0 && !isLoading && !rateLimitHit) return null;

  var buttonLabel = language === 'si'
    ? (isExpanded ? 'Skrij' : 'Prikazi') + ' vizualizacije (' + charts.length + ')'
    : (isExpanded ? 'Hide' : 'Show') + ' visualizations (' + charts.length + ')';

  return (
    <div style={{ marginTop: '8px' }}>

      {rateLimitHit && charts.length === 0 && !isLoading && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 12px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#b45309',
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '9999px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {language === 'si'
            ? 'Vizualizacije niso na voljo \u2014 API kvota izcr\u0301pana. Poskusite pozneje.'
            : 'Visualizations unavailable \u2014 API quota exceeded. Try again later.'}
        </div>
      )}

      {isLoading && charts.length === 0 && (
        <button
          disabled={true}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 500,
            color: theme.colors.text.muted,
            backgroundColor: theme.colors.surface.background,
            border: '1px solid ' + theme.colors.border.light,
            borderRadius: theme.radii.full,
            cursor: 'wait',
          }}
        >
          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>&#x27F3;</span>
          {language === 'si' ? 'Analiziram podatke...' : 'Analyzing data...'}
        </button>
      )}

      {charts.length > 0 && (
        <button
          onClick={function () { setIsExpanded(!isExpanded); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 500,
            color: theme.colors.secondary[600],
            backgroundColor: theme.colors.secondary[50],
            border: '1px solid ' + theme.colors.secondary[200],
            borderRadius: theme.radii.full,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={function (e) {
            (e.target as HTMLButtonElement).style.backgroundColor = theme.colors.secondary[100];
          }}
          onMouseLeave={function (e) {
            (e.target as HTMLButtonElement).style.backgroundColor = theme.colors.secondary[50];
          }}
        >
          <ChartIcon size={14} />
          {buttonLabel}
        </button>
      )}

      {isExpanded && charts.length > 0 && (
        <div style={{
          marginTop: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          {charts.map(function (chart) {
            return (
              <ChartRenderer
                key={chart.id}
                data={chart}
                height={220}
                showTitle={true}
                showSource={true}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InlineChart;
