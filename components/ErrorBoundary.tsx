// components/ErrorBoundary.tsx
// ═══════════════════════════════════════════════════════════════
// React Error Boundary — catches render crashes and logs to DB
// v1.0 — 2026-03-01
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { errorLogService } from '../services/errorLogService.ts';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error);

    errorLogService.logError({
      errorMessage: error.message,
      errorCode: 'REACT_RENDER_CRASH',
      errorStack: error.stack || '',
      component: 'ErrorBoundary',
      context: {
        componentStack: errorInfo.componentStack || '',
      },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#F8FAFC', padding: '2rem',
        }}>
          <div style={{
            background: '#FFF', borderRadius: 12, padding: '3rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)', maxWidth: 520,
            textAlign: 'center', border: '1px solid #E2E8F0',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem' }}>
              Nepričakovana napaka
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Prišlo je do napake pri prikazu aplikacije. Napaka je bila avtomatsko zabeležena.
              <br />
              <span style={{ fontStyle: 'italic', fontSize: '0.8rem' }}>
                An unexpected error occurred. The error has been automatically logged.
              </span>
            </p>
            {this.state.error && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FEE2E2',
                borderRadius: 8, padding: '0.75rem', marginBottom: '1.5rem',
                textAlign: 'left', fontSize: '0.75rem', color: '#991B1B',
                fontFamily: 'monospace', maxHeight: 120, overflow: 'auto',
                wordBreak: 'break-all',
              }}>
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              style={{
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                color: '#FFF', border: 'none', borderRadius: 8,
                padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
              }}
            >
              Ponovno naloži / Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
