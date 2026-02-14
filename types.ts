// types.ts
// ═══════════════════════════════════════════════════════════════
// Central type definitions for Intervencijska logika
// v4.3 — 2026-02-14 — CHANGES:
//   - Added 'environmental' to RiskCategory type
// ═══════════════════════════════════════════════════════════════

// ─── Problem Analysis ────────────────────────────────────────
export interface ProblemNode {
  id: string;
  text: string;
  children?: ProblemNode[];
}

export interface PolicyItem {
  id: string;
  level: 'eu' | 'national' | 'regional' | 'local';
  name: string;
  description: string;
  relevance: string;
}

export interface ObjectiveItem {
  id: string;
  text: string;
  indicators: string;
  targetValue: string;
  baselineValue: string;
  verificationSource: string;
}

// ─── Readiness Levels ────────────────────────────────────────
export interface ReadinessLevels {
  trl: number;
  srl: number;
  orl: number;
  lrl: number;
}

// ─── Tasks & Work Packages ───────────────────────────────────
export interface TaskDependency {
  taskId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lag: number;
}

export interface Task {
  id: string;
  wpId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  duration: number;
  dependencies: TaskDependency[];
  responsiblePartner: string;
  resources: string;
  isManagement?: boolean;
}

export interface Milestone {
  id: string;
  wpId: string;
  title: string;
  date: string;
  description: string;
  verificationMethod: string;
}

export interface Deliverable {
  id: string;
  wpId: string;
  title: string;
  date: string;
  type: 'report' | 'prototype' | 'software' | 'dataset' | 'other';
  description: string;
  disseminationLevel: 'public' | 'confidential' | 'restricted';
}

export interface WorkPackage {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  leadPartner: string;
  participants: string[];
  tasks: Task[];
  milestones: Milestone[];
  deliverables: Deliverable[];
  isManagement?: boolean;
}

// ─── Risk Management ─────────────────────────────────────────
export type RiskCategory = 'technical' | 'social' | 'economic' | 'environmental';
export type RiskLikelihood = 'low' | 'medium' | 'high';
export type RiskImpact = 'low' | 'medium' | 'high';

export interface RiskItem {
  id: string;
  category: RiskCategory;
  description: string;
  likelihood: RiskLikelihood;
  impact: RiskImpact;
  mitigation: string;
  contingency: string;
  responsiblePartner: string;
}

// ─── KER (Key Exploitable Results) ──────────────────────────
export interface KERItem {
  id: string;
  title: string;
  description: string;
  type: 'product' | 'process' | 'service' | 'method' | 'knowledge' | 'other';
  owners: string;
  exploitationStrategy: string;
  targetUsers: string;
  ipProtection: string;
  trlCurrent: number;
  trlTarget: number;
}

// ─── Result Items ────────────────────────────────────────────
export interface ResultItem {
  id: string;
  text: string;
  indicators: string;
  targetValue: string;
  verificationSource: string;
}

// ─── Project Management ──────────────────────────────────────
export interface ProjectManagementStructure {
  coordinator: string;
  steeringCommittee: string;
  advisoryBoard: string;
  wpLeaders: string[];
}

export interface ProjectManagement {
  description: string;
  structure: ProjectManagementStructure;
}

// ─── Project Sections ────────────────────────────────────────
export interface ProblemAnalysis {
  coreProblem: string;
  causes: ProblemNode[];
  consequences: ProblemNode[];
  stakeholders: string;
  policies: PolicyItem[];
}

export interface ProjectIdea {
  title: string;
  summary: string;
  innovation: string;
  targetGroups: string;
  expectedImpact: string;
  readinessLevels: ReadinessLevels;
}

export interface ProjectData {
  problemAnalysis: ProblemAnalysis;
  projectIdea: ProjectIdea;
  generalObjectives: ObjectiveItem[];
  specificObjectives: ObjectiveItem[];
  activities: WorkPackage[];
  projectManagement: ProjectManagement;
  risks: RiskItem[];
  outputs: ResultItem[];
  outcomes: ResultItem[];
  impacts: ResultItem[];
  kers: KERItem[];
  projectStartDate?: string;
  projectEndDate?: string;
}

// ─── App State Types ─────────────────────────────────────────
export type Language = 'en' | 'si';
export type ViewMode = 'standard' | 'academic';

export interface ProjectVersions {
  [versionId: string]: {
    data: ProjectData;
    timestamp: number;
    label: string;
  };
}

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  language: Language;
  mode: ViewMode;
  currentVersionId: string;
  versions: ProjectVersions;
}

export interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  options?: { label: string; value: string; description?: string }[];
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}

// ─── Export Data ─────────────────────────────────────────────
export interface ExportData {
  projectMeta: ProjectMeta;
  projectData: ProjectData;
  exportDate: string;
  appVersion: string;
}

// ─── Chart Image Data ────────────────────────────────────────
export interface ChartImageData {
  gantt?: string;
  pert?: string;
  organigram?: string;
}

// ─── Auth ────────────────────────────────────────────────────
export interface UserRecord {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

export interface AuthResult {
  success: boolean;
  user?: UserRecord;
  error?: string;
}

// ─── Instruction Types ───────────────────────────────────────
export interface InstructionSet {
  global: string;
  language: string;
  academic: string;
  humanization: string;
  projectTitle: string;
  mode: string;
  qualityGates: string;
  sectionTask: string;
  fieldRules: string;
  translation: string;
  summary: string;
  chapter: string;
}

// ─── Gantt / PERT Internal ───────────────────────────────────
export interface GanttTask {
  id: string;
  wpId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  dependencies: TaskDependency[];
  progress: number;
  isWpSummary?: boolean;
  isMilestone?: boolean;
  milestoneDate?: Date;
}

export interface PertNode {
  id: string;
  title: string;
  es: number;
  ef: number;
  ls: number;
  lf: number;
  slack: number;
  isCritical: boolean;
  dependencies: string[];
  x?: number;
  y?: number;
}

// ─── Readiness Level Definitions ─────────────────────────────
export interface ReadinessLevelDefinition {
  key: string;
  name: string;
  description: string;
  levels: { value: number; title: { en: string; si: string } }[];
}

// ─── Step Navigation ─────────────────────────────────────────
export interface StepDefinition {
  id: number;
  key: string;
  title: { en: string; si: string };
  color: string;
}

export interface SubStepDefinition {
  id: string;
  key: string;
  title: { en: string; si: string };
}
