// components/StepNavigationBar.tsx
// ═══════════════════════════════════════════════════════════════
// Horizontal intervention logic navigation bar with connected circles.
// v1.1 — 2026-02-21
//   ★ v1.1: Responsive sizing — circles and arrows scale on smaller screens
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { ICONS, getSteps } from '../constants.tsx';
import { stepColors, radii, animation, typography, type StepColorKey } from '../design/theme.ts';
import { lightColors, darkColors } from '../design/theme.ts';
import { getThemeMode } from '../services/themeService.ts';

interface StepNavigationBarProps {
  language: 'en' | 'si';
  currentStepId: number;
  completedStepsStatus: boolean[];
  onStepClick: (stepId: number) => void;
  isProblemAnalysisComplete: boolean;
}

const StepNavigationBar: React.FC<StepNavigationBarProps> = ({
  language,
  currentStepId,
  completedStepsStatus,
  onStepClick,
  isProblemAnalysisComplete,
}) => {
  const isDark = getThemeMode() === 'dark';
  const colors = isDark ? darkColors : lightColors;
  const STEPS = getSteps(language);

  // ★ v1.1: Responsive breakpoint
  const [isCompact, setIsCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => setIsCompact(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive sizes
  const activeSize = isCompact ? 30 : 42;
  const inactiveSize = isCompact ? 26 : 36;
  const arrowWidth = isCompact ? 16 : 28;
  const arrowHeight = isCompact ? 10 : 16;
  const checkSize = isCompact ? 12 : 16;
  const activeFontSize = isCompact ? '9px' : '12px';
  const inactiveFontSize = isCompact ? '8px' : '10px';
  const labelFontSize = isCompact ? '7px' : '9px';
  const borderActive = isCompact ? 2 : 3;
  const borderInactive = isCompact ? 1.5 : 2;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0,
      padding: isCompact ? '0 2px' : '0 8px',
      height: '100%',
    }}>
      {STEPS.map((step, idx) => {
        const stepKey = step.key as StepColorKey;
        const sc = stepColors[stepKey];
        const isActive = currentStepId === step.id;
        const isCompleted = completedStepsStatus[idx];
        const isClickable = step.id === 1 || isProblemAnalysisComplete;
        const size = isActive ? activeSize : inactiveSize;

        return (
          <React.Fragment key={step.id}>
            {/* Arrow before each step (except first) */}
            {idx > 0 && (
              <svg width={arrowWidth} height={arrowHeight} viewBox={`0 0 ${arrowWidth} ${arrowHeight}`} style={{ flexShrink: 0, opacity: 0.4 }}>
                <line x1="0" y1={arrowHeight / 2} x2={arrowWidth - 8} y2={arrowHeight / 2} stroke={colors.border.medium} strokeWidth={isCompact ? 1 : 1.5} />
                <polygon points={`${arrowWidth - 8},${arrowHeight / 2 - 4} ${arrowWidth},${arrowHeight / 2} ${arrowWidth - 8},${arrowHeight / 2 + 4}`} fill={colors.border.medium} />
              </svg>
            )}

            {/* Step circle */}
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              title={step.title}
              style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: isActive
                  ? sc.main
                  : isCompleted
                    ? sc.main
                    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                border: isActive
                  ? `${borderActive}px solid ${sc.border}`
                  : isCompleted
                    ? `${borderInactive}px solid ${sc.main}`
                    : `${borderInactive}px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isClickable ? 'pointer' : 'not-allowed',
                opacity: isClickable ? 1 : 0.35,
                transition: `all ${animation.duration.fast} ${animation.easing.default}`,
                flexShrink: 0,
                position: 'relative',
                boxShadow: isActive ? `0 0 ${isCompact ? 6 : 12}px ${sc.main}40` : 'none',
                padding: 0,
              }}
            >
              {isCompleted && !isActive ? (
                <ICONS.CHECK style={{
                  width: checkSize, height: checkSize, color: 'white',
                }} />
              ) : (
                <span style={{
                  fontSize: isActive ? activeFontSize : inactiveFontSize,
                  fontWeight: 800,
                  color: (isActive || isCompleted) ? 'white' : colors.text.muted,
                  lineHeight: 1,
                  fontFamily: typography.fontFamily.sans,
                }}>
                  {step.id}
                </span>
              )}

              {/* Step label — only for active, hidden on compact */}
              {isActive && !isCompact && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginTop: '4px',
                  whiteSpace: 'nowrap',
                  fontSize: labelFontSize,
                  fontWeight: 700,
                  color: sc.main,
                  letterSpacing: '0.02em',
                  pointerEvents: 'none',
                }}>
                  {step.title}
                </div>
              )}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepNavigationBar;
