// components/InlineChart.tsx
// ═══════════════════════════════════════════════════════════════
// v2.0 — 2026-02-25 — Manual trigger + serialized queue + rate limit stop
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef } from 'react';
import { extractEmpiricalData, type ExtractedChartData } from '../services/DataExtractionService.ts';
import { resolveAllChartTypes } from '../services/ChartTypeResolver.ts';
import ChartRenderer from './ChartRenderer.tsx';
import { theme } from '../design/theme.ts';

// ─── Module-level cache ──────────────────────────────────────

var extractionCache = new Map<string, ExtractedChartData[]>();

var getTextHash = function (text: string): string {
  return text.substring(0, 100) + '__' + text.length;
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

  var statusState = useState<'idle' | 'done' | 'rate_limit' | 'error'>('idle');
  var status = statusState[0];
  var setStatus = statusState[1];

  var lastExtractedTextRef = useRef<string>('');

  // ─── Check cache on mount ─────────────────────────────────

  var cachedCharts = function (): ExtractedChartData[] | null {
    if (text.length < minTextLength) return null;
    var cacheKey = getTextHash(text);
    var cached = extractionCache.get(cacheKey);
    if (cached && cached.length > 0) return cached;
    return null;
  };

  // If we have cache, show it immediately without user clicking
  var initialCache = cachedCharts();
  if (initialCache && charts.length === 0 && status === 'idle') {
    // Can't call setState during render, use ref check
    if (lastExtractedTextRef.current !== text) {
      lastExtractedTextRef.current = text;
      // Schedule state update
      setTimeout(function () {
        setCharts(initialCache);
        setStatus('done');
        setIsExpanded(false);
      }, 0);
    }
  }

  // ─── Manual extraction trigger ────────────────────────────

  var handleGenerateCharts = useCallback(async function () {
    if (text.length < minTextLength) return;

    // Check cache first
    var cacheKey = getTextHash(text);
    var cached = extractionCache.get(cacheKey);
    if (cached && cached.length > 0) {
      console.log('[InlineChart] Cache HIT for "' + (fieldContext || '') + '" (' + cached.length + ' charts)');
      setCharts(cached);
      setStatus('done');
      setIsExpanded(true);
      return;
    }

    setIsLoading(true);
    setStatus('idle');

    try {
      console.log('[InlineChart] Extracting for "' + (fieldContext || '') + '"...');
      var extracted = await extractEmpiricalData(text, fieldContext);
      var resolved = resolveAllChartTypes(extracted);
      var limited = resolved.slice(0, maxCharts);

      if (limited.length > 0) {
        extractionCache.set(cacheKey, limited);
        console.log('[InlineChart] Cache SET for "' + (fieldContext || '') + '" (' + limited.length + ' charts)');
        setCharts(limited);
        setStatus('done');
        setIsExpanded(true);
        lastExtractedTextRef.current = text;
      } else {
        // Check if failure was due to rate limit (DataExtractionService swallows errors)
        var lastLog = '';
        var origWarn = console.warn;
        // We can't check retroactively, but we can check extracted length vs input
        // If text has numbers/percentages but extracted is empty, likely rate limited
        var hasNumbers = /\d+[\.,]?\d*\s*%/.test(text) || /\b\d{2,}\b/.test(text);
        if (hasNumbers && extracted.length === 0) {
          console.warn('[InlineChart] Text has empirical data but extraction returned 0 — likely rate limited');
          setStatus('rate_limit');
        } else {
          console.log('[InlineChart] No visualizable data in "' + (fieldContext || '') + '"');
          setStatus('done');
        }
        setCharts([]);
      }

    } catch (err: any) {
      var errMsg = (err && err.message) ? err.message : String(err);
      console.warn('[InlineChart] Extraction failed for "' + (fieldContext || '') + '":', errMsg);

      if (errMsg.indexOf('RATE_LIMIT') >= 0 || errMsg.indexOf('429') >= 0 || errMsg.indexOf('Quota') >= 0) {
        setStatus('rate_limit');
      } else {
        setStatus('error');
      }
      setCharts([]);
    } finally {
      setIsLoading(false);
    }
  }, [text, fieldContext, minTextLength, maxCharts]);

  // ─── Don't render if text too short ───────────────────────

  if (text.length < minTextLength) return null;

  // ─── Render ───────────────────────────────────────────────

  return (
    <div style={{ marginTop: '8px' }}>

      {status === 'rate_limit' && (
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
            ? 'API kvota izcrpana \u2014 pocakajte 1-2 minuti in poskusite ponovno.'
            : 'API quota exceeded \u2014 wait 1-2 minutes and try again.'}
        </div>
      )}

      {status === 'error' && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 12px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#dc2626',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '9999px',
        }}>
          {language === 'si'
            ? 'Napaka pri analizi podatkov. Poskusite ponovno.'
            : 'Data analysis error. Please try again.'}
        </div>
      )}

      {isLoading && (
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

      {!isLoading && charts.length === 0 && status !== 'rate_limit' && status !== 'error' && (
        <button
          onClick={handleGenerateCharts}
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
          {language === 'si' ? 'Generiraj vizualizacije' : 'Generate visualizations'}
        </button>
      )}

      {!isLoading && charts.length > 0 && (
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
          {language === 'si'
            ? (isExpanded ? 'Skrij' : 'Prikazi') + ' vizualizacije (' + charts.length + ')'
            : (isExpanded ? 'Hide' : 'Show') + ' visualizations (' + charts.length + ')'}
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
