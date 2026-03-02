// components/GuideTooltip.tsx
// ═══════════════════════════════════════════════════════════════
// v1.1 — 2026-03-02 — FIX: z-index raised to 9999 to appear above form fields
// Contextual Guide Tooltip — info button (ⓘ) that opens a floating
// panel with tabbed content from guideContent.ts
// Supports: dark mode, bilingual (EN/SI), animated, click-outside-close
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getFieldGuide } from '../services/guideContent.ts';
import { colors, darkColors, typography, radii, shadows, zIndex, animation, spacing } from '../design/theme.ts';

// ─── TYPES ─────────────────────────────────────────────────────
interface GuideTooltipProps {
  stepKey: string;
  fieldKey: string;
  language: string;
  isDarkMode?: boolean;
  position?: 'right' | 'left' | 'bottom';
  size?: 'sm' | 'md';
}

interface GuideEntry {
  whatIsThis: string;
  whyImportant: string;
  whatToWrite: string;
  tips: string;
  euContext: string;
  example: string;
}

// ─── TAB DEFINITIONS ───────────────────────────────────────────
var TAB_KEYS = ['whatIsThis', 'whyImportant', 'whatToWrite', 'tips', 'euContext', 'example'];

var TAB_LABELS = {
  en: {
    whatIsThis: 'What is this?',
    whyImportant: 'Why important?',
    whatToWrite: 'What to write',
    tips: 'Tips',
    euContext: 'EU Context',
    example: 'Example',
  },
  si: {
    whatIsThis: 'Kaj je to?',
    whyImportant: 'Zakaj pomembno?',
    whatToWrite: 'Kaj napisati',
    tips: 'Nasveti',
    euContext: 'EU kontekst',
    example: 'Primer',
  },
};

var TAB_ICONS = {
  whatIsThis: '\u2139\uFE0F',
  whyImportant: '\u2B50',
  whatToWrite: '\u270F\uFE0F',
  tips: '\uD83D\uDCA1',
  euContext: '\uD83C\uDDEA\uD83C\uDDFA',
  example: '\uD83D\uDCCB',
};

// ─── COMPONENT ─────────────────────────────────────────────────
var GuideTooltip = function GuideTooltip(props: GuideTooltipProps) {
  var stepKey = props.stepKey;
  var fieldKey = props.fieldKey;
  var language = props.language || 'en';
  var isDarkMode = props.isDarkMode || false;
  var position = props.position || 'right';
  var size = props.size || 'md';

  var panelRef = useRef<HTMLDivElement>(null);
  var buttonRef = useRef<HTMLButtonElement>(null);

  var stateOpen = useState(false);
  var isOpen = stateOpen[0];
  var setIsOpen = stateOpen[1];

  var stateTab = useState(0);
  var activeTab = stateTab[0];
  var setActiveTab = stateTab[1];

  // Get guide content
  var guide: GuideEntry | null = null;
  try {
    guide = getFieldGuide(stepKey, fieldKey, language);
  } catch (e) {
    guide = null;
  }

  // If no guide content exists, don't render anything
  if (!guide) return null;

  // Check if guide has any content
  var hasContent = TAB_KEYS.some(function(key) {
    return guide && guide[key] && guide[key].trim() !== '';
  });
  if (!hasContent) return null;

  // Click outside handler
  useEffect(function() {
    if (!isOpen) return;
    var handleClickOutside = function(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return function() {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(function() {
    if (!isOpen) return;
    var handleEsc = function(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return function() {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  // Theme colors
  var c = isDarkMode ? darkColors : colors;
  var lang = (language === 'si' ? 'si' : 'en') as 'en' | 'si';
  var labels = TAB_LABELS[lang];

  // Filter tabs to only those with content
  var visibleTabs = TAB_KEYS.filter(function(key) {
    return guide && guide[key] && guide[key].trim() !== '';
  });

  // Panel dimensions
  var panelWidth = size === 'sm' ? 320 : 400;
  var maxHeight = 360;

  // Position styles
  var getPanelPosition = function(): React.CSSProperties {
    var base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 9999,
      width: panelWidth + 'px',
      maxHeight: maxHeight + 'px',
    };
    if (position === 'right') {
      base.left = '100%';
      base.marginLeft = '8px';
      base.top = '-8px';
    } else if (position === 'left') {
      base.right = '100%';
      base.marginRight = '8px';
      base.top = '-8px';
    } else {
      base.left = '50%';
      base.transform = 'translateX(-50%)';
      base.top = '100%';
      base.marginTop = '8px';
    }
    return base;
  };

  var handleToggle = function() {
    setIsOpen(!isOpen);
    setActiveTab(0);
  };

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '6px', zIndex: isOpen ? 9999 : 'auto' }}>
      {/* Info button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        aria-label="Guide"
        style={{
          width: size === 'sm' ? '20px' : '22px',
          height: size === 'sm' ? '20px' : '22px',
          borderRadius: radii.full,
          border: '1.5px solid ' + (isOpen ? c.primary[500] : c.border.medium),
          background: isOpen ? c.primary[50] : 'transparent',
          color: isOpen ? c.primary[600] : c.text.muted,
          fontSize: size === 'sm' ? '11px' : '12px',
          fontWeight: typography.fontWeight.bold,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all ' + animation.duration.fast + ' ' + animation.easing.default,
          flexShrink: 0,
          lineHeight: 1,
          padding: 0,
        }}
        onMouseEnter={function(e) {
          if (!isOpen) {
            e.currentTarget.style.borderColor = c.primary[400];
            e.currentTarget.style.color = c.primary[500];
            e.currentTarget.style.background = c.primary[50];
          }
        }}
        onMouseLeave={function(e) {
          if (!isOpen) {
            e.currentTarget.style.borderColor = c.border.medium;
            e.currentTarget.style.color = c.text.muted;
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        i
      </button>

      {/* Floating panel */}
      {isOpen && (
        <div
          ref={panelRef}
          style={Object.assign({}, getPanelPosition(), {
            background: isDarkMode ? c.surface.card : '#FFFFFF',
            border: '1px solid ' + c.border.light,
            borderRadius: radii.xl,
            boxShadow: shadows.xl,
            overflow: 'hidden',
            animation: 'guideTooltipFadeIn ' + animation.duration.normal + ' ' + animation.easing.out,
          })}
        >
          {/* Tab bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '2px',
            padding: '8px 8px 0 8px',
            borderBottom: '1px solid ' + c.border.light,
            background: isDarkMode ? (c as any).surface.cardAlt || c.surface.card : '#F8FAFC',
          }}>
            {visibleTabs.map(function(tabKey, idx) {
              var isActive = activeTab === idx;
              return (
                <button
                  key={tabKey}
                  onClick={function() { setActiveTab(idx); }}
                  style={{
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.normal,
                    color: isActive ? c.primary[700] : c.text.muted,
                    background: isActive ? '#FFFFFF' : 'transparent',
                    border: isActive ? '1px solid ' + c.border.light : '1px solid transparent',
                    borderBottom: isActive ? '1px solid #FFFFFF' : '1px solid transparent',
                    borderRadius: radii.md + ' ' + radii.md + ' 0 0',
                    cursor: 'pointer',
                    transition: 'all ' + animation.duration.fast,
                    marginBottom: '-1px',
                    whiteSpace: 'nowrap' as const,
                    lineHeight: '1.3',
                  }}
                  onMouseEnter={function(e) {
                    if (!isActive) {
                      e.currentTarget.style.color = c.primary[600];
                      e.currentTarget.style.background = c.primary[50];
                    }
                  }}
                  onMouseLeave={function(e) {
                    if (!isActive) {
                      e.currentTarget.style.color = c.text.muted;
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {TAB_ICONS[tabKey] + ' ' + labels[tabKey]}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div style={{
            padding: '14px 16px',
            maxHeight: (maxHeight - 60) + 'px',
            overflowY: 'auto' as const,
            fontSize: typography.fontSize.sm,
            lineHeight: typography.lineHeight.relaxed,
            color: c.text.body,
          }}>
            {guide[visibleTabs[activeTab]] || ''}
          </div>

          {/* Close hint */}
          <div style={{
            padding: '6px 16px 8px',
            borderTop: '1px solid ' + c.border.light,
            fontSize: '10px',
            color: c.text.muted,
            textAlign: 'right' as const,
            background: isDarkMode ? (c as any).surface.cardAlt || c.surface.card : '#F8FAFC',
          }}>
            ESC {lang === 'si' ? 'za zapiranje' : 'to close'}
          </div>
        </div>
      )}

      {/* Animation keyframes — injected once */}
      <style>{'\
        @keyframes guideTooltipFadeIn {\
          from { opacity: 0; transform: translateY(4px); }\
          to { opacity: 1; transform: translateY(0); }\
        }\
      '}</style>
    </span>
  );
};

export default GuideTooltip;
