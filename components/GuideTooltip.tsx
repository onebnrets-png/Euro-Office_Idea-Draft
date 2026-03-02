// components/GuideTooltip.tsx
// ═══════════════════════════════════════════════════════════════
// v1.3 — 2026-03-02 — FIX: position:fixed + viewport clamping (scroll container fix)
// v1.2 — 2026-03-02 — FIX: Use React Portal to render panel in document.body
//   so it always appears ABOVE all form fields regardless of stacking context
// v1.1 — 2026-03-02 — FIX: z-index raised (insufficient — stacking context issue)
// v1.0 — 2026-03-02 — Initial version
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
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

  // ★ v1.2: Track panel position for portal rendering
  var statePanelPos = useState({ top: 0, left: 0 });
  var panelPos = statePanelPos[0];
  var setPanelPos = statePanelPos[1];

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

  // ★ v1.2: Calculate panel position from button bounding rect
  var updatePanelPosition = useCallback(function() {
    if (!buttonRef.current) return;
    var rect = buttonRef.current.getBoundingClientRect();
    var panelWidth = size === 'sm' ? 320 : 400;

    var top = 0;
    var left = 0;

    if (position === 'right') {
      top = rect.top - 8;
      left = rect.right + 8;
      if (left + panelWidth > window.innerWidth - 16) {
        left = rect.left - panelWidth - 8;
      }
    } else if (position === 'left') {
      top = rect.top - 8;
      left = rect.left - panelWidth - 8;
      if (left < 16) {
        left = rect.right + 8;
      }
    } else {
      top = rect.bottom + 8;
      left = rect.left + (rect.width / 2) - (panelWidth / 2);
      if (left < 16) left = 16;
      if (left + panelWidth > window.innerWidth - 16) left = window.innerWidth - 16 - panelWidth;
    }

    // Clamp top to viewport
    if (top < 8) top = 8;
    if (top + 360 > window.innerHeight - 8) top = window.innerHeight - 8 - 360;

    setPanelPos({ top: top, left: left });
  }, [position, size]);

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

  // ★ v1.2: Recalculate position on scroll/resize while open
  useEffect(function() {
    if (!isOpen) return;
    updatePanelPosition();
    var handleScrollOrResize = function() {
      updatePanelPosition();
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return function() {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePanelPosition]);

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

  var handleToggle = function() {
    if (!isOpen) {
      updatePanelPosition();
    }
    setIsOpen(!isOpen);
    setActiveTab(0);
  };

  // ★ v1.2: Portal panel — rendered into document.body
  var portalPanel = isOpen ? ReactDOM.createPortal(
    React.createElement('div', {
      ref: panelRef,
      style: {
        position: 'fixed',
        top: panelPos.top + 'px',
        left: panelPos.left + 'px',
        width: panelWidth + 'px',
        maxHeight: maxHeight + 'px',
        zIndex: 99999,
        background: isDarkMode ? c.surface.card : '#FFFFFF',
        border: '1px solid ' + c.border.light,
        borderRadius: radii.xl,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        animation: 'guideTooltipFadeIn ' + animation.duration.normal + ' ' + animation.easing.out,
      },
    },
      // Tab bar
      React.createElement('div', {
        style: {
          display: 'flex',
          flexWrap: 'wrap' as const,
          gap: '2px',
          padding: '8px 8px 0 8px',
          borderBottom: '1px solid ' + c.border.light,
          background: isDarkMode ? ((c as any).surface.cardAlt || c.surface.card) : '#F8FAFC',
        },
      },
        visibleTabs.map(function(tabKey, idx) {
          var isActive = activeTab === idx;
          return React.createElement('button', {
            key: tabKey,
            onClick: function() { setActiveTab(idx); },
            style: {
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
            },
            onMouseEnter: function(e) {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.color = c.primary[600];
                (e.currentTarget as HTMLElement).style.background = c.primary[50];
              }
            },
            onMouseLeave: function(e) {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.color = c.text.muted;
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }
            },
          }, TAB_ICONS[tabKey] + ' ' + labels[tabKey]);
        })
      ),

      // Tab content
      React.createElement('div', {
        style: {
          padding: '14px 16px',
          maxHeight: (maxHeight - 60) + 'px',
          overflowY: 'auto' as const,
          fontSize: typography.fontSize.sm,
          lineHeight: typography.lineHeight.relaxed,
          color: c.text.body,
        },
      }, guide[visibleTabs[activeTab]] || ''),

      // Close hint
      React.createElement('div', {
        style: {
          padding: '6px 16px 8px',
          borderTop: '1px solid ' + c.border.light,
          fontSize: '10px',
          color: c.text.muted,
          textAlign: 'right' as const,
          background: isDarkMode ? ((c as any).surface.cardAlt || c.surface.card) : '#F8FAFC',
        },
      }, 'ESC ' + (lang === 'si' ? 'za zapiranje' : 'to close'))
    ),
    document.body
  ) : null;

  // ─── RENDER ────────────────────────────────────────────────
  return React.createElement('span', {
    style: { position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '6px' },
  },
    // Info button
    React.createElement('button', {
      ref: buttonRef,
      onClick: handleToggle,
      'aria-label': 'Guide',
      style: {
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
      },
      onMouseEnter: function(e) {
        if (!isOpen) {
          (e.currentTarget as HTMLElement).style.borderColor = c.primary[400];
          (e.currentTarget as HTMLElement).style.color = c.primary[500];
          (e.currentTarget as HTMLElement).style.background = c.primary[50];
        }
      },
      onMouseLeave: function(e) {
        if (!isOpen) {
          (e.currentTarget as HTMLElement).style.borderColor = c.border.medium;
          (e.currentTarget as HTMLElement).style.color = c.text.muted;
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      },
    }, 'i'),

    // Portal panel (rendered in document.body)
    portalPanel,

    // Animation keyframes
    React.createElement('style', null, '\n@keyframes guideTooltipFadeIn {\n  from { opacity: 0; transform: translateY(4px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n')
  );
};

export default GuideTooltip;
