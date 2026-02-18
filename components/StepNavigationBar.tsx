// components/StepNavigationBar.tsx
// ═══════════════════════════════════════════════════════════════
// Horizontal intervention logic navigation bar with connected circles.
// Replaces WelcomeScreen circular layout.
// v1.0 — 2026-02-18
// ═══════════════════════════════════════════════════════════════

import React from 'react';
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

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0,
      padding: '0 8px',
      height: '100%',
    }}>
      {STEPS.map((step, idx) => {
        const stepKey = step.key as StepColorKey;
        const sc = stepColors[stepKey];
        const isActive = currentStepId === step.id;
        const isCompleted = completedStepsStatus[idx];
        const isClickable = step.id === 1 || isProblemAnalysisComplete;

        return (
          <React.Fragment key={step.id}>
            {/* Arrow before each step (except first) */}
            {idx > 0 && (
              <svg width="28" height="16" viewBox="0 0 28 16" style={{ flexShrink: 0, opacity: 0.4 }}>
                <line x1="0" y1="8" x2="20" y2="8" stroke={colors.border.medium} strokeWidth="1.5" />
                <polygon points="18,4 26,8 18,12" fill={colors.border.medium} />
              </svg>
            )}

            {/* Step circle */}
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              title={step.title}
              style={{
                width: isActive ? 42 : 36,
                height: isActive ? 42 : 36,
                borderRadius: '50%',
                background: isActive
                  ? sc.main
                  : isCompleted
                    ? sc.main
                    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                border: isActive
                  ? `3px solid ${sc.border}`
                  : isCompleted
                    ? `2px solid ${sc.main}`
                    : `2px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isClickable ? 'pointer' : 'not-allowed',
                opacity: isClickable ? 1 : 0.35,
                transition: `all ${animation.duration.fast} ${animation.easing.default}`,
                flexShrink: 0,
                position: 'relative',
                boxShadow: isActive ? `0 0 12px ${sc.main}40` : 'none',
                transform: isActive ? 'scale(1)' : 'scale(1)',
              }}
            >
              {/* Completed check or step number */}
              {isCompleted && !isActive ? (
                <ICONS.CHECK style={{
                  width: 16, height: 16, color: 'white',
                }} />
              ) : (
                <span style={{
                  fontSize: isActive ? '12px' : '10px',
                  fontWeight: 800,
                  color: (isActive || isCompleted) ? 'white' : colors.text.muted,
                  lineHeight: 1,
                  fontFamily: typography.fontFamily.sans,
                }}>
                  {step.id}
                </span>
              )}

              {/* Step label — only for active */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginTop: '4px',
                  whiteSpace: 'nowrap',
                  fontSize: '9px',
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
