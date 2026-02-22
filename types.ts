// types.ts
// ═══════════════════════════════════════════════════════════════
// TypeScript type definitions for the EU Project Idea Draft app.
// v6.0 — 2026-02-22 — CHANGES:
//   - ★ v6.0: Partnership & Finance data model
//     → PM_HOURS_PER_MONTH = 143 (EU standard)
//     → FundingModel, CostModelType types
//     → ProjectPartner, DirectCostItem, IndirectCostItem,
//       TaskPartnerAllocation interfaces
//     → CENTRALIZED_DIRECT_COSTS, CENTRALIZED_INDIRECT_COSTS,
//       DECENTRALIZED_DIRECT_COSTS, DECENTRALIZED_INDIRECT_COSTS constants
//     → Task extended with optional partnerAllocations
//     → ProjectData extended with partners[], fundingModel, maxPartners
//   - v5.1: Multi-tenant organization types
//   - v5.0: Chart image data, admin logs, extraction types
// ═══════════════════════════════════════════════════════════════

// ─── EU STANDARD: PERSON-MONTH ───────────────────────────────────
export const PM_HOURS_PER_MONTH = 143;

// ─── FUNDING MODEL ───────────────────────────────────────────────
export type FundingModel = 'centralized' | 'decentralized';
export type CostModelType = 'actual' | 'unit' | 'lumpSum' | 'flatRate';

// ─── COST CATEGORY CONSTANTS ─────────────────────────────────────

export const CENTRALIZED_DIRECT_COSTS = [
  { key: 'labourCosts', en: 'Labour costs', si: 'Stroški dela' },
  { key: 'subContractorCosts', en: 'Sub-contractor costs', si: 'Stroški podizvajalcev' },
  { key: 'travelCosts', en: 'Travel costs', si: 'Potovalni stroški' },
  { key: 'materials', en: 'Materials / Consumables', si: 'Material / Potrošni material' },
  { key: 'depreciationEquipment', en: 'Depreciation of equipment', si: 'Amortizacija opreme' },
  { key: 'otherProjectCosts', en: 'Other project costs', si: 'Drugi projektni stroški' },
  { key: 'investmentCosts', en: 'Investment costs', si: 'Investicijski stroški' },
];

export const CENTRALIZED_INDIRECT_COSTS = [
  { key: 'rent', en: 'Rent', si: 'Najemnina' },
  { key: 'operatingCosts', en: 'Operating costs', si: 'Obratovalni stroški' },
  { key: 'telecommunications', en: 'Telecommunications', si: 'Telekomunikacije' },
  { key: 'smallConsumables', en: 'Small consumables', si: 'Drobni potrošni material' },
  { key: 'administrativeCosts', en: 'Administrative costs', si: 'Administrativni stroški' },
];

export const DECENTRALIZED_DIRECT_COSTS = [
  { key: 'salariesReimbursements', en: 'Salaries and work-related reimbursements', si: 'Stroški plač in povračila stroškov v zvezi z delom' },
  { key: 'externalServiceCosts', en: 'External service provider costs', si: 'Stroški zunanjih izvajalcev storitev' },
  { key: 'vat', en: 'VAT', si: 'DDV' },
  { key: 'intangibleAssetInvestment', en: 'Investments in intangible assets', si: 'Investicije v neopredmetena sredstva' },
  { key: 'depreciationBasicAssets', en: 'Depreciation of basic assets', si: 'Amortizacija osnovnih sredstev' },
  { key: 'infoCommunication', en: 'Information & communication costs', si: 'Stroški informiranja in komuniciranja' },
  { key: 'tangibleAssetInvestment', en: 'Investments in tangible assets', si: 'Investicije v opredmetena osnovna sredstva' },
];

export const DECENTRALIZED_INDIRECT_COSTS = [
  { key: 'rent', en: 'Rent', si: 'Najemnina' },
  { key: 'operatingCosts', en: 'Operating costs', si: 'Obratovalni stroški' },
  { key: 'telecommunications', en: 'Telecommunications', si: 'Telekomunikacije' },
  { key: 'smallConsumables', en: 'Small consumables', si: 'Drobni potrošni material' },
  { key: 'administrativeCosts', en: 'Administrative costs', si: 'Administrativni stroški' },
];

// ─── PROBLEM ANALYSIS ────────────────────────────────────────────

export interface ProblemItem {
  title: string;
  description: string;
}

export interface CoreProblem {
  title: string;
  description: string;
}

export interface ProblemAnalysis {
  coreProblem: CoreProblem;
  causes: ProblemItem[];
  consequences: ProblemItem[];
}

// ─── POLICIES ────────────────────────────────────────────────────

export interface PolicyItem {
  name: string;
  description: string;
}

// ─── OBJECTIVES ──────────────────────────────────────────────────

export interface ObjectiveItem {
  title: string;
  description: string;
  indicator: string;
}

// ─── READINESS LEVELS ────────────────────────────────────────────

export interface ReadinessLevel {
  level: number | null;
  justification: string;
}

export interface ReadinessLevels {
  TRL: ReadinessLevel;
  SRL: ReadinessLevel;
  ORL: ReadinessLevel;
  LRL: ReadinessLevel;
}

// ─── PARTNERSHIP ─────────────────────────────────────────────────

export interface ProjectPartner {
  id: string;
  code: string;
  name: string;
  expertise: string;
  pmRate: number;
}

// ─── FINANCE: COST ITEMS ─────────────────────────────────────────

export interface DirectCostItem {
  id: string;
  categoryKey: string;
  name: string;
  amount: number;
  costModel?: CostModelType;
}

export interface IndirectCostItem {
  id: string;
  categoryKey: string;
  name: string;
  percentage: number;
  appliesTo: string[];
  calculatedAmount: number;
}

// ─── TASK-LEVEL PARTNER ALLOCATION ───────────────────────────────

export interface TaskPartnerAllocation {
  partnerId: string;
  hours: number;
  pm: number;
  directCosts: DirectCostItem[];
  indirectCosts: IndirectCostItem[];
  totalCost: number;
}

// ─── TASKS, WPs ──────────────────────────────────────────────────

export interface TaskDependency {
  predecessorId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  dependencies: TaskDependency[];
  partnerAllocations?: TaskPartnerAllocation[];
}

export interface Milestone {
  id: string;
  description: string;
  date: string;
}

export interface Deliverable {
  id: string;
  title: string;
  description: string;
  indicator: string;
}

export interface WorkPackage {
  id: string;
  title: string;
  tasks: Task[];
  milestones: Milestone[];
  deliverables: Deliverable[];
}

// ─── RISK ────────────────────────────────────────────────────────

export interface RiskItem {
  id: string;
  category: 'technical' | 'social' | 'economic' | 'environmental';
  title: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

// ─── KER ─────────────────────────────────────────────────────────

export interface KERItem {
  id: string;
  title: string;
  description: string;
  exploitationStrategy: string;
}

// ─── RESULT ITEMS ────────────────────────────────────────────────

export interface ResultItem {
  title: string;
  description: string;
  indicator: string;
}

// ─── PROJECT MANAGEMENT ──────────────────────────────────────────

export interface ProjectManagementStructure {
  coordinator: string;
  steeringCommittee: string;
  advisoryBoard: string;
  wpLeaders: string;
}

export interface ProjectManagement {
  description: string;
  structure: ProjectManagementStructure;
}

// ─── PROJECT IDEA ────────────────────────────────────────────────

export interface ProjectIdea {
  projectTitle: string;
  projectAcronym: string;
  startDate: string;
  durationMonths: number;
  mainAim: string;
  proposedSolution: string;
  stateOfTheArt: string;
  readinessLevels: ReadinessLevels;
  policies: PolicyItem[];
}

// ─── FULL PROJECT DATA ───────────────────────────────────────────

export interface ProjectData {
  problemAnalysis: ProblemAnalysis;
  projectIdea: ProjectIdea;
  generalObjectives: ObjectiveItem[];
  specificObjectives: ObjectiveItem[];
  projectManagement: ProjectManagement;
  activities: WorkPackage[];
  outputs: ResultItem[];
  outcomes: ResultItem[];
  impacts: ResultItem[];
  risks: RiskItem[];
  kers: KERItem[];
  partners?: ProjectPartner[];
  fundingModel?: FundingModel;
  maxPartners?: number;
}

// ─── VERSIONING & META ───────────────────────────────────────────

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  language: 'en' | 'si';
  version: number;
}

export interface SavedProject {
  meta: ProjectMeta;
  data: ProjectData;
  translations?: Record<string, ProjectData>;
}

// ─── MODAL CONFIGURATION ─────────────────────────────────────────

export interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'confirm' | 'choice';
  actions?: ModalAction[];
}

export interface ModalAction {
  label: string;
  variant: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
}

// ─── EXPORT & CHART TYPES ────────────────────────────────────────

export interface ExportData {
  projectName: string;
  exportDate: string;
  data: ProjectData;
}

export interface ChartImageData {
  stepKey: string;
  subStepKey: string;
  imageDataUrl: string;
  width: number;
  height: number;
}

// ─── AUTH ─────────────────────────────────────────────────────────

export interface AuthRecord {
  id: string;
  email: string;
  displayName?: string;
  apiKey?: string;
  modelName?: string;
  createdAt: string;
}

// ─── INSTRUCTIONS ────────────────────────────────────────────────

export interface InstructionSet {
  id: string;
  name: string;
  systemPrompt: string;
  isDefault: boolean;
}

// ─── GANTT / PERT ────────────────────────────────────────────────

export interface GanttTask {
  id: string;
  wpId: string;
  title: string;
  startDate: string;
  endDate: string;
  dependencies: TaskDependency[];
  progress?: number;
}

export interface PERTTask {
  id: string;
  wpId: string;
  title: string;
  duration: number;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slack: number;
  isCritical: boolean;
  dependencies: string[];
}

// ─── READINESS LEVEL DEFINITIONS ─────────────────────────────────

export interface ReadinessLevelDefinition {
  level: number;
  title: string;
}

export interface ReadinessLevelCategory {
  name: string;
  description: string;
  levels: ReadinessLevelDefinition[];
}

export interface ReadinessLevelsDefinitions {
  TRL: ReadinessLevelCategory;
  SRL: ReadinessLevelCategory;
  ORL: ReadinessLevelCategory;
  LRL: ReadinessLevelCategory;
}

// ─── STEP NAVIGATION ─────────────────────────────────────────────

export interface StepDefinition {
  id: number;
  key: string;
  title: string;
  color: string;
}

export interface SubStepDefinition {
  id: string;
  key: string;
  title: string;
}

// ─── ADMIN ───────────────────────────────────────────────────────

export type AdminRole = 'superadmin' | 'admin' | 'user';

export interface AdminUserProfile {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  createdAt: string;
  lastLogin?: string;
  apiKey?: string;
  modelName?: string;
}

export interface AdminLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
}

// ─── CHART VISUALIZATION ─────────────────────────────────────────

export type ChartType =
  | 'bar'
  | 'pie'
  | 'line'
  | 'radar'
  | 'doughnut'
  | 'polarArea'
  | 'bubble'
  | 'scatter'
  | 'treemap'
  | 'sankey'
  | 'horizontalBar'
  | 'stackedBar'
  | 'heatmap'
  | 'funnel'
  | 'waterfall'
  | 'gauge'
  | 'timeline'
  | 'orgChart'
  | 'flowChart'
  | 'mindMap'
  | 'network';

export interface ExtractedDataPoint {
  label: string;
  value: number;
  category?: string;
  group?: string;
}

export interface ChartDataExtraction {
  chartType: ChartType;
  title: string;
  data: ExtractedDataPoint[];
  labels?: string[];
  datasets?: any[];
}

// ─── ORGANIZATION / MULTI-TENANT (v5.1) ─────────────────────────

export type OrgRole = 'owner' | 'admin' | 'member';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  logoUrl?: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgRole;
  email: string;
  displayName?: string;
  joinedAt: string;
}

export interface OrganizationInstructions {
  id: string;
  organizationId: string;
  systemPrompt: string;
  updatedAt: string;
  updatedBy: string;
}
