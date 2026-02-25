// components/InlineChart.tsx
// ═══════════════════════════════════════════════════════════════
// Inline chart component — sits next to text fields and displays
// automatically extracted empirical data visualizations.
//
// v1.1 — 2026-02-25 — FIX: Module-level cache to survive remount
//   ★ NEW: extractionCache — Map that persists across component remounts
//   ★ NEW: getTextHash() — simple text fingerprint for cache key
//   ★ CHANGED: doExtraction() checks cache before AI call, stores after success
//   ★ CHANGED: useEffect instant cache restore on remount (no 2s debounce)
//   ★ CHANGED: Cache invalidation on significant text change (>= 20 chars)
//
// v1.0 — 2026-02-17 — Initial version
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { extractEmpiricalData, type ExtractedChartData } from '../services/DataExtractionService.ts';
import { resolveAllChartTypes } from '../services/ChartTypeResolver.ts';
import ChartRenderer from './ChartRenderer.tsx';
import { theme } from '../design/theme.ts';

// ─── Module-level cache — survives component remount ─────────

const extractionCache = new Map<string, ExtractedChartData[]>();

const getTextHash = (text: string): string => {
  return `${text.substring(0, 100)}__${text.length}`;
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

const ChartIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="8" width="3" height="7" rx="0.5" fill={color || theme.colors.secondary[500]} opacity="0.8" />
    <rect x="5.5" y="4" width="3" height="11" rx="0.5" fill={color || theme.colors.primary[500]} opacity="0.8" />
    <rect x="10" y="1" width="3" height="14" rx="0.5" fill={color || theme.colors.success[500]} opacity="0.8" />
  </svg>
);

// ─── Component ───────────────────────────────────────────────

const InlineChart: React.FC<InlineChartProps> = ({
  text,
  fieldContext,
  language = 'en',
  minTextLength = 50,
  maxCharts = 3,
}) => {
  const [charts, setCharts] = useState<ExtractedChartData[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasExtracted, setHasExtracted] = useState(false);
  const lastTextRef = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ★ DIAGNOSTIC: Log every mount
  useEffect(() => {
    console.log('[InlineChart] ★ MOUNTED — fieldContext:', fieldContext, '| text length:', text?.length, '| text preview:', text?.substring(0, 50));
  }, []);

  // ─── Extract data on text change (debounced) ─────────────

  const doExtraction = useCallback(async (currentText: string) => {
    if (currentText.length < minTextLength) {
      setCharts([]);
      setHasExtracted(false);
      return;
    }

    // ★ FIX v1.1: Check cache first — no AI call needed on remount
    const cacheKey = getTextHash(currentText);
    const cached = extractionCache.get(cacheKey);
    if (cached) {
      console.log(`[InlineChart] ★ Cache HIT for "${fieldContext}" (${cached.length} charts)`);
      setCharts(cached);
      setHasExtracted(true);
      return;
    }

    setIsLoading(true);
    try {
      const extracted = await extractEmpiricalData(currentText, fieldContext);
      const resolved = resolveAllChartTypes(extracted);
      const limited = resolved.slice(0, maxCharts);

      // ★ FIX v1.1: Store in cache
      extractionCache.set(cacheKey, limited);
      console.log(`[InlineChart] ★ Cache SET for "${fieldContext}" (${limited.length} charts)`);

      setCharts(limited);
      setHasExtracted(true);
    } catch (err) {
      console.warn('[InlineChart] Extraction failed:', err);
      // ★ FIX v1.1: On failure, check if we have stale cache
      const stale = extractionCache.get(cacheKey);
      if (stale) {
        console.log(`[InlineChart] ★ Using stale cache for "${fieldContext}" after failure`);
        setCharts(stale);
        setHasExtracted(true);
      } else {
        setCharts([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fieldContext, minTextLength, maxCharts]);

  // ─── Trigger extraction on text change ────────────────────

  useEffect(() => {
    // ★ DIAGNOSTIC 2
    console.log('[InlineChart] useEffect TEXT — fieldContext:', fieldContext, '| text===lastRef:', text === lastTextRef.current, '| textLen:', text?.length, '| lastRefLen:', lastTextRef.current?.length);

    if (text === lastTextRef.current) return;

    const lengthDiff = Math.abs(text.length - lastTextRef.current.length);
    const previousText = lastTextRef.current;
    lastTextRef.current = text;

    // ★ FIX v1.1: On remount (previousText was ''), check cache immediately — no debounce
    if (previousText === '' && text.length >= minTextLength) {
      const cacheKey = getTextHash(text);
      const cached = extractionCache.get(cacheKey);
      if (cached) {
        console.log(`[InlineChart] ★ Instant cache restore for "${fieldContext}"`);
        setCharts(cached);
        setHasExtracted(true);
        return;
      }
    }

    // Skip if minor edit and already extracted
    if (hasExtracted && lengthDiff < 20) return;

    // ★ FIX v1.1: If text changed significantly, invalidate cache for old text
    if (previousText && lengthDiff >= 20) {
      const oldKey = getTextHash(previousText);
      extractionCache.delete(oldKey);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doExtraction(text);
    }, 2000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, doExtraction, hasExtracted, minTextLength, fieldContext]);

  // ─── Render nothing if no charts ─────────────────────────

  if (!hasExtracted && !isLoading) return null;
  if (hasExtracted && charts.length === 0 && !isLoading) return null;

  // ─── Toggle button ────────────────────────────────────────

  const buttonLabel = language === 'si'
    ? `${isExpanded ? 'Skrij' : 'Prikaži'} vizualizacije (${charts.length})`
    : `${isExpanded ? 'Hide' : 'Show'} visualizations (${charts.length})`;

  return (
    <div style={{ marginTop: '8px' }}>
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={isLoading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          fontSize: '12px',
          fontWeight: 500,
          color: isLoading ? theme.colors.text.muted : theme.colors.secondary[600],
          backgroundColor: isLoading ? theme.colors.surface.background : theme.colors.secondary[50],
          border: `1px solid ${isLoading ? theme.colors.border.light : theme.colors.secondary[200]}`,
          borderRadius: theme.radii.full,
          cursor: isLoading ? 'wait' : 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            (e.target as HTMLButtonElement).style.backgroundColor = theme.colors.secondary[100];
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading) {
            (e.target as HTMLButtonElement).style.backgroundColor = theme.colors.secondary[50];
          }
        }}
      >
        {isLoading ? (
          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>&#x27F3;</span>
        ) : (
          <ChartIcon size={14} />
        )}
        {isLoading
          ? (language === 'si' ? 'Analiziram podatke...' : 'Analyzing data...')
          : buttonLabel
        }
      </button>

      {/* Charts panel */}
      {isExpanded && charts.length > 0 && (
        <div style={{
          marginTop: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          {charts.map(chart => (
            <ChartRenderer
              key={chart.id}
              data={chart}
              height={220}
              showTitle={true}
              showSource={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default InlineChart;
