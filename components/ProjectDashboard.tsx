// components/ProjectDashboard.tsx
// v2.2 - 2026-02-17  Professional SVG icons, extended completeness calc
import React, { useState, useEffect, useMemo } from 'react';
import { extractStructuralData } from '../services/DataExtractionService.ts';
import ChartRenderer from './ChartRenderer.tsx';
import { lightColors, darkColors, shadows, radii, spacing, typography } from '../design/theme.ts';
import { getThemeMode, onThemeChange } from '../services/themeService.ts';
import { ProgressRing } from '../design/index.ts';

// --- Props ---
interface ProjectDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: any;
  language: 'en' | 'si';
}

// --- Professional SVG Icons ---
const DashboardIcons = {
  document: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  tag: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  calendar: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  play: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  ),
  layers: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  shield: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  target: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
};

// --- Section completeness calculator ---
const calculateOverallCompleteness = (projectData: any): number => {
  const sections = [
    'problemAnalysis', 'projectIdea', 'generalObjectives',
    'specificObjectives', 'projectManagement', 'activities',
    'outputs', 'outcomes', 'impacts', 'risks', 'kers',
  ];

  const SKIP_FIELDS = new Set([
    'startDate', 'durationMonths', '_calculatedEndDate', '_projectTimeframe',
    'id', 'project_id', 'created_at', 'updated_at',
  ]);

  let filledSections = 0;
  let totalSections = 0;

  for (const key of sections) {
    const data = projectData?.[key];
    if (data === undefined || data === null) continue;

    totalSections++;

    if (Array.isArray(data)) {
      if (data.length === 0) continue;
      const filled = data.filter((item: any) => {
        if (typeof item === 'string') return item.trim().length > 0;
        if (typeof item !== 'object' || item === null) return false;
        const hasTitle = item.title && typeof item.title === 'string' && item.title.trim().length > 0;
        const hasDesc = item.description && typeof item.description === 'string' && item.description.trim().length > 0;
        return hasTitle || hasDesc;
      });
      filledSections += filled.length / data.length;
    } else if (typeof data === 'object') {
      const entries = Object.entries(data).filter(([k]) => !SKIP_FIELDS.has(k));
      if (entries.length === 0) { filledSections += 1; continue; }
      const filled = entries.filter(([_, v]) => {
        if (typeof v === 'string') return v.trim().length > 0;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'number') return true;
        if (typeof v === 'object' && v !== null) {
          return Object.values(v).some((sv: any) =>
            typeof sv === 'string' ? sv.trim().length > 0 :
            typeof sv === 'number' ? true :
            Array.isArray(sv) ? sv.length > 0 :
            sv !== null && sv !== undefined
          );
        }
        return false;
      });
      filledSections += filled.length / entries.length;
    }
  }

  if (totalSections === 0) return 0;
  return Math.round((filledSections / totalSections) * 100);
};

// --- Component ---
const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  isOpen, onClose, projectData, language,
}) => {
  const [isDark, setIsDark] = useState(getThemeMode() === 'dark');
  useEffect(() => {
    const unsub = onThemeChange((m) => setIsDark(m === 'dark'));
    return unsub;
  }, []);
  const colors = isDark ? darkColors : lightColors;

  const t = language === 'si' ? {
    title: 'Pregled projekta',
    projectTitle: 'Naziv projekta',
    acronym: 'Akronim',
    duration: 'Trajanje',
    startDate: 'Začetek',
    months: 'mesecev',
    overallProgress: 'Skupni napredek',
    noData: 'Še ni podatkov za vizualizacijo.',
    close: 'Zapri',
    workPackages: 'Delovni sklopi',
    risks: 'Tveganja',
    objectives: 'Cilji',
  } : {
    title: 'Project Dashboard',
    projectTitle: 'Project Title',
    acronym: 'Acronym',
    duration: 'Duration',
    startDate: 'Start Date',
    months: 'months',
    overallProgress: 'Overall Progress',
    noData: 'No data available for visualization yet.',
    close: 'Close',
    workPackages: 'Work Packages',
    risks: 'Risks',
    objectives: 'Objectives',
  };

  const structuralCharts = useMemo(
    () => extractStructuralData(projectData),
    [projectData]
  );

  const overallCompleteness = useMemo(
    () => calculateOverallCompleteness(projectData),
    [projectData]
  );

  const pi = projectData?.projectIdea;
  const wpCount = projectData?.activities?.length || 0;
  const riskCount = projectData?.risks?.length || 0;
  const objCount = (projectData?.generalObjectives?.length || 0) + (projectData?.specificObjectives?.length || 0);

  if (!isOpen) return null;

  // Icon color palette — subtle, professional
  const iconColors = {
    primary: colors.primary[500],
    secondary: colors.secondary[500],
    warning: colors.warning[500],
    success: colors.success[500],
  };

  // Meta info card with SVG icon
  const MetaCard = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
    <div style={{
      backgroundColor: colors.surface.card,
      borderRadius: radii.lg,
      border: `1px solid ${colors.border.light}`,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: radii.lg,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          {label}
        </p>
        <p style={{
          fontSize: '15px', fontWeight: 700, color: colors.text.heading, margin: '2px 0 0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value || '—'}
        </p>
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: colors.surface.overlayBlur,
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: colors.surface.background,
          borderRadius: radii.xl,
          boxShadow: shadows.xl,
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: `1px solid ${colors.border.light}`,
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border.light}`,
          backgroundColor: colors.surface.card,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: colors.text.heading }}>
              {t.title}
            </h2>
            <ProgressRing
              value={overallCompleteness}
              size={48}
              strokeWidth={5}
              color={overallCompleteness >= 80 ? colors.success[500] : overallCompleteness >= 40 ? colors.warning[500] : colors.error[500]}
              label={`${overallCompleteness}%`}
            />
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: radii.md,
              color: colors.text.muted,
              fontSize: '20px',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = colors.surface.sidebar; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Meta cards row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <MetaCard label={t.projectTitle} value={pi?.projectTitle || ''} icon={DashboardIcons.document(iconColors.primary)} />
            <MetaCard label={t.acronym} value={pi?.projectAcronym || ''} icon={DashboardIcons.tag(iconColors.secondary)} />
            <MetaCard label={t.duration} value={pi?.durationMonths ? `${pi.durationMonths} ${t.months}` : ''} icon={DashboardIcons.calendar(iconColors.primary)} />
            <MetaCard label={t.startDate} value={pi?.startDate || ''} icon={DashboardIcons.play(iconColors.success)} />
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
            <MetaCard label={t.workPackages} value={String(wpCount)} icon={DashboardIcons.layers(iconColors.primary)} />
            <MetaCard label={t.risks} value={String(riskCount)} icon={DashboardIcons.shield(iconColors.warning)} />
            <MetaCard label={t.objectives} value={String(objCount)} icon={DashboardIcons.target(iconColors.success)} />
          </div>

          {/* Charts */}
          {structuralCharts.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
              {structuralCharts.map(chart => (
                <ChartRenderer
                  key={chart.id}
                  data={chart}
                  height={280}
                  showTitle={true}
                  showSource={false}
                />
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: colors.text.muted,
              fontSize: '14px',
            }}>
              {t.noData}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border.light}`,
          backgroundColor: colors.surface.card,
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: 600,
              color: colors.text.body,
              backgroundColor: colors.surface.sidebar,
              border: `1px solid ${colors.border.light}`,
              borderRadius: radii.md,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = colors.border.light; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = colors.surface.sidebar; }}
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboard;
