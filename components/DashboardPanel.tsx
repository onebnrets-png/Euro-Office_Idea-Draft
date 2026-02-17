// components/DashboardPanel.tsx
// ═══════════════════════════════════════════════════════════════
// Persistent right-side dashboard panel — always visible.
// Mirrors Sidebar collapse behavior on the right side.
// v1.0 — 2026-02-17
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { extractStructuralData } from '../services/DataExtractionService.ts';
import ChartRenderer from './ChartRenderer.tsx';
import { lightColors, darkColors, shadows, radii, spacing, typography, animation } from '../design/theme.ts';
import { getThemeMode, onThemeChange } from '../services/themeService.ts';
import { ProgressRing } from '../design/index.ts';

// ─── Props ───────────────────────────────────────────────────

interface DashboardPanelProps {
  projectData: any;
  language: 'en' | 'si';
  onCollapseChange?: (collapsed: boolean) => void;
}

// ─── Professional SVG Icons ─────────────────────────────────

const Icons = {
  document: (c: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  tag: (c: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  calendar: (c: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  play: (c: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  ),
  layers: (c: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  shield: (c: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  target: (c: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  chevronLeft: (c: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  chevronRight: (c: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  dashboard: (c: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
};

// ─── Completeness calculator ─────────────────────────────────

const calculateCompleteness = (projectData: any): number => {
  const sections = [
    'problemAnalysis', 'projectIdea', 'generalObjectives',
    'specificObjectives', 'projectManagement', 'activities',
    'outputs', 'outcomes', 'impacts', 'risks', 'kers',
  ];
  const SKIP = new Set(['startDate', 'durationMonths', '_calculatedEndDate', '_projectTimeframe', 'id', 'project_id', 'created_at', 'updated_at']);
  let filled = 0, total = 0;

  for (const key of sections) {
    const data = projectData?.[key];
    if (data === undefined || data === null) continue;
    total++;
    if (Array.isArray(data)) {
      if (data.length === 0) continue;
      const f = data.filter((item: any) => {
        if (typeof item !== 'object' || !item) return false;
        return (item.title && item.title.trim().length > 0) || (item.description && item.description.trim().length > 0);
      });
      filled += f.length / data.length;
    } else if (typeof data === 'object') {
      const entries = Object.entries(data).filter(([k]) => !SKIP.has(k));
      if (entries.length === 0) { filled += 1; continue; }
      const f = entries.filter(([_, v]) => {
        if (typeof v === 'string') return v.trim().length > 0;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'number') return true;
        if (typeof v === 'object' && v !== null) return Object.values(v).some((sv: any) => sv !== null && sv !== undefined);
        return false;
      });
      filled += f.length / entries.length;
    }
  }
  return total === 0 ? 0 : Math.round((filled / total) * 100);
};

// ─── Component ───────────────────────────────────────────────

const DashboardPanel: React.FC<DashboardPanelProps> = ({ projectData, language, onCollapseChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(getThemeMode() === 'dark');

  useEffect(() => {
    const unsub = onThemeChange((m) => setIsDark(m === 'dark'));
    return unsub;
  }, []);

  const colors = isDark ? darkColors : lightColors;
  const PANEL_WIDTH = 300;
  const COLLAPSED_WIDTH = 52;

  const handleToggle = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    onCollapseChange?.(next);
  };

  const completeness = useMemo(() => calculateCompleteness(projectData), [projectData]);

  const pi = projectData?.projectIdea;
  const wpCount = projectData?.activities?.length || 0;
  const riskCount = projectData?.risks?.length || 0;
  const objCount = (projectData?.generalObjectives?.length || 0) + (projectData?.specificObjectives?.length || 0);

  const structuralCharts = useMemo(() => extractStructuralData(projectData), [projectData]);

  const t = language === 'si' ? {
    title: 'Dashboard',
    projectTitle: 'Naziv',
    acronym: 'Akronim',
    duration: 'Trajanje',
    startDate: 'Začetek',
    months: 'mes.',
    wp: 'DS',
    risks: 'Tveg.',
    obj: 'Cilji',
  } : {
    title: 'Dashboard',
    projectTitle: 'Title',
    acronym: 'Acronym',
    duration: 'Duration',
    startDate: 'Start',
    months: 'mo.',
    wp: 'WPs',
    risks: 'Risks',
    obj: 'Obj.',
  };

  const ic = {
    p: colors.primary[500],
    s: colors.secondary[500],
    w: colors.warning[500],
    g: colors.success[500],
  };

  // ─── Collapsed view ────────────────────────────────────────

  if (isCollapsed) {
    return (
      <div style={{
        width: COLLAPSED_WIDTH,
        height: '100%',
        background: colors.surface.card,
        borderLeft: `1px solid ${colors.border.light}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: spacing.md,
        gap: spacing.md,
        flexShrink: 0,
        position: 'relative',
        transition: `width 0.3s cubic-bezier(0.4, 0, 0.2, 1)`,
      }}>
        {/* Expand button */}
        <button onClick={handleToggle} title="Expand dashboard" style={{
          width: 32, height: 32, borderRadius: radii.md,
          border: `1px solid ${colors.border.light}`, background: colors.surface.sidebar,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: colors.text.muted, transition: `all ${animation.duration.fast}`,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = colors.primary[50]; e.currentTarget.style.color = colors.primary[600]; }}
          onMouseLeave={e => { e.currentTarget.style.background = colors.surface.sidebar; e.currentTarget.style.color = colors.text.muted; }}
        >
          {Icons.chevronLeft(colors.text.muted)}
        </button>

        {/* Mini progress */}
        <ProgressRing value={completeness} size={36} strokeWidth={4}
          color={completeness >= 80 ? colors.success[500] : completeness >= 40 ? colors.warning[500] : colors.error[500]}
          label={`${completeness}`}
        />

        {/* Mini stats */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <div title={t.wp} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {Icons.layers(ic.p)}
            <span style={{ fontSize: '10px', fontWeight: 700, color: colors.text.heading, marginTop: '2px' }}>{wpCount}</span>
          </div>
          <div title={t.risks} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {Icons.shield(ic.w)}
            <span style={{ fontSize: '10px', fontWeight: 700, color: colors.text.heading, marginTop: '2px' }}>{riskCount}</span>
          </div>
          <div title={t.obj} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {Icons.target(ic.g)}
            <span style={{ fontSize: '10px', fontWeight: 700, color: colors.text.heading, marginTop: '2px' }}>{objCount}</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Expanded view ─────────────────────────────────────────

  const MiniStat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 10px', borderRadius: radii.md,
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    }}>
      {icon}
      <span style={{ fontSize: '11px', color: colors.text.muted, flex: 1 }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 700, color: colors.text.heading }}>{value}</span>
    </div>
  );

  const MetaRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0',
    }}>
      <div style={{ flexShrink: 0, opacity: 0.7 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '10px', color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{
          fontSize: '12px', fontWeight: 600, color: colors.text.heading,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{value || '—'}</div>
      </div>
    </div>
  );

  return (
    <div style={{
      width: PANEL_WIDTH,
      height: '100%',
      background: colors.surface.card,
      borderLeft: `1px solid ${colors.border.light}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
      transition: `width 0.3s cubic-bezier(0.4, 0, 0.2, 1)`,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${colors.border.light}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {Icons.dashboard(colors.primary[500])}
          <span style={{ fontSize: '13px', fontWeight: 700, color: colors.text.heading }}>{t.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ProgressRing value={completeness} size={32} strokeWidth={3}
            color={completeness >= 80 ? colors.success[500] : completeness >= 40 ? colors.warning[500] : colors.error[500]}
            label={`${completeness}`}
          />
          <button onClick={handleToggle} title="Collapse dashboard" style={{
            width: 28, height: 28, borderRadius: radii.md,
            border: `1px solid ${colors.border.light}`, background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: colors.text.muted, transition: `all ${animation.duration.fast}`,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = colors.primary[50]; e.currentTarget.style.color = colors.primary[600]; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.text.muted; }}
          >
            {Icons.chevronRight(colors.text.muted)}
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Project meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <MetaRow icon={Icons.document(ic.p)} label={t.projectTitle} value={pi?.projectTitle || ''} />
          <MetaRow icon={Icons.tag(ic.s)} label={t.acronym} value={pi?.projectAcronym || ''} />
          <MetaRow icon={Icons.calendar(ic.p)} label={t.duration} value={pi?.durationMonths ? `${pi.durationMonths} ${t.months}` : ''} />
          <MetaRow icon={Icons.play(ic.g)} label={t.startDate} value={pi?.startDate || ''} />
        </div>

        {/* Separator */}
        <hr style={{ border: 'none', borderTop: `1px solid ${colors.border.light}`, margin: 0 }} />

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <MiniStat icon={Icons.layers(ic.p)} label={t.wp} value={String(wpCount)} />
          <MiniStat icon={Icons.shield(ic.w)} label={t.risks} value={String(riskCount)} />
          <MiniStat icon={Icons.target(ic.g)} label={t.obj} value={String(objCount)} />
        </div>

        {/* Separator */}
        <hr style={{ border: 'none', borderTop: `1px solid ${colors.border.light}`, margin: 0 }} />

        {/* Mini charts */}
        {structuralCharts.map(chart => (
          <div key={chart.id} style={{ borderRadius: radii.lg, overflow: 'hidden' }}>
            <ChartRenderer
              data={chart}
              height={180}
              showTitle={true}
              showSource={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPanel;
