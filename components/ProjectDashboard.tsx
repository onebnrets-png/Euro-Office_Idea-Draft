// components/ProjectDashboard.tsx
// ═══════════════════════════════════════════════════════════════
// Project Dashboard — full-screen modal overview
// v2.3 — 2026-02-18
//   - FIX: calculateOverallCompleteness now returns 0% for empty projects
//   - FIX: readinessLevels with {level:null, justification:''} no longer
//     count as filled (empty string '' was truthy in old !== null check)
//   - FIX: Default enum fields (category, likelihood, impact) skipped
//   - FIX: Numbers no longer count as real content
//   - FIX: Uses binary section checks (filled/not) instead of fractional
//     counting that produced false 1% values
// v2.2 — 2026-02-17
//   - Professional SVG icons, extended completeness calc
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { extractStructuralData } from '../services/DataExtractionService.ts';
import ChartRenderer from './ChartRenderer.tsx';
import { lightColors, darkColors, shadows, radii, spacing, typography } from '../design/theme.ts';
import { getThemeMode, onThemeChange } from '../services/themeService.ts';
import { ProgressRing } from '../design/index.ts';

// ─── Props ───────────────────────────────────────────────────

interface ProjectDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: any;
  language: 'en' | 'si';
}

// ─── Professional SVG Icons ─────────────────────────────────

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

// ─── Helpers: detect real user-entered content ───────────────
// v2.3 FIX: Immune to skeleton defaults

const SKIP_KEYS = new Set([
  'id', 'project_id', 'created_at', 'updated_at',
  'category', 'likelihood', 'impact', 'type', 'dependencies',
  'startDate', 'durationMonths', '_calculatedEndDate', '_projectTimeframe',
]);

const hasRealStr = (v: any): boolean =>
  typeof v === 'string' && v.trim().length > 0;

const arrHasContent = (arr: any[]): boolean => {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  return arr.some((item: any) => {
    if (typeof item === 'string') return item.trim().length > 0;
    if (typeof item !== 'object' || item === null) return false;
    return Object.entries(item).some(([k, v]) => {
      if (SKIP_KEYS.has(k)) return false;
      if (typeof v === 'string') return v.trim().length > 0;
      if (Array.isArray(v)) return arrHasContent(v);
      return false;
    });
  });
};

const objHasContent = (obj: any): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  if (Array.isArray(obj)) return arrHasContent(obj);
  return Object.entries(obj).some(([k, v]) => {
    if (SKIP_KEYS.has(k)) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    // DO NOT count numbers — durationMonths:24 is not user content
    // DO NOT count null — readinessLevels level:null is not content
    if (Array.isArray(v)) return arrHasContent(v);
    if (typeof v === 'object' && v !== null) return objHasContent(v);
    return false;
  });
};

// ─── Section completeness calculator ─────────────────────────
// v2.3 — Binary checks per section (filled or not), no fractional math
// This prevents the old bug where 0.14/11*100 = 1.27 → rounded to 1%

const calculateOverallCompleteness = (projectData: any): number => {
  if (!projectData) return 0;

  const sectionChecks: { key: string; check: (data: any) => boolean }[] = [
    {
      key: 'problemAnalysis',
      check: (d) => {
        if (!d) return false;
        return (
          hasRealStr(d.coreProblem?.title) ||
          hasRealStr(d.coreProblem?.description) ||
          arrHasContent(d.causes) ||
          arrHasContent(d.consequences)
        );
      },
    },
    {
      key: 'projectIdea',
      check: (d) => {
        if (!d) return false;
        return (
          hasRealStr(d.projectTitle) ||
          hasRealStr(d.projectAcronym) ||
          hasRealStr(d.mainAim) ||
          hasRealStr(d.stateOfTheArt) ||
          hasRealStr(d.proposedSolution) ||
          arrHasContent(d.policies) ||
          // Only count readiness levels if at least one level is a real number > 0
          (d.readinessLevels && [
            d.readinessLevels.TRL,
            d.readinessLevels.SRL,
            d.readinessLevels.ORL,
            d.readinessLevels.LRL,
          ].some((r: any) => typeof r?.level === 'number' && r.level > 0))
        );
      },
    },
    {
      key: 'generalObjectives',
      check: (d) => arrHasContent(d),
    },
    {
      key: 'specificObjectives',
      check: (d) => arrHasContent(d),
    },
    {
      key: 'projectManagement',
      check: (d) => {
        if (!d) return false;
        return hasRealStr(d.description) || objHasContent(d.structure);
      },
    },
    {
      key: 'activities',
      check: (d) => {
        if (!Array.isArray(d)) return false;
        return d.some((wp: any) =>
          hasRealStr(wp.title) ||
          arrHasContent(wp.tasks) ||
          arrHasContent(wp.milestones) ||
          arrHasContent(wp.deliverables)
        );
      },
    },
    { key: 'outputs', check: (d) => arrHasContent(d) },
    { key: 'outcomes', check: (d) => arrHasContent(d) },
    { key: 'impacts', check: (d) => arrHasContent(d) },
    {
      key: 'risks',
      check: (d) => {
        if (!Array.isArray(d)) return false;
        // Only count risks with real title, description, or mitigation
        return d.some((r: any) =>
          hasRealStr(r.title) || hasRealStr(r.description) || hasRealStr(r.mitigation)
        );
      },
    },
    {
      key: 'kers',
      check: (d) => arrHasContent(d),
    },
  ];

  let filledCount = 0;
  let totalCount = 0;

  for (const { key, check } of sectionChecks) {
    const data = projectData?.[key];
    if (data === undefined || data === null) continue;
    totalCount++;
    if (check(data)) filledCount++;
  }

  return totalCount === 0 ? 0 : Math.round((filledCount / totalCount) * 100);
};

// ─── Component ───────────────────────────────────────────────

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
  const wpCount = projectData?.activities?.filter((wp: any) => hasRealStr(wp.title)).length || 0;
  const riskCount = projectData?.risks?.filter((r: any) => hasRealStr(r.title)).length || 0;
  const objCount =
