// ==========================================
// ERPMetrics 360 — Global Core Types
// ==========================================

/** User roles in the platform */
export type Role = 'Administrador' | 'Analista' | 'Gerente' | 'Usuario';

/** Module status */
export type ModuleStatus = 'Activo' | 'Inactivo';

/** Course access approval status */
export type CourseApprovalStatus = 'approved' | 'pending' | 'locked';

/** Strategy status */
export type StrategyStatus = 'En Progreso' | 'Planeado' | 'Revisión';

/** Report category */
export type ReportCategory = 'RETAIL CORE' | 'TECH OPS' | 'LOGISTICS' | 'SUPPLY CHAIN' | 'E-COMMERCE';

/** Report period */
export type ReportPeriod = 'Anual' | 'Trimestral' | 'Mensual';

/** Export format */
export type ExportFormat = 'PDF' | 'CSV' | 'Excel';

/** Course permission record */
export interface CourseAccessPermissions {
  bigData: CourseApprovalStatus;
  microsoftAzure: CourseApprovalStatus;
}

/** User in the system */
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  initials: string;
  modules: ModulePermissions;
  courseAccess?: CourseAccessPermissions;
}

/** Module definition */
export interface Module {
  id: string;
  name: string;
  description: string;
  status: ModuleStatus;
  icon: string;
}

/** Module permissions per user */
export interface ModulePermissions {
  carga: boolean;
  analisis: boolean;
  tendencias: boolean;
  bigData?: boolean;
  azure?: boolean;
}

/** Operative strategy */
export interface Strategy {
  id: string;
  title: string;
  description: string;
  status: StrategyStatus;
  icon: string;
}

/** Sector distribution for analytics */
export interface SectorDistribution {
  name: string;
  percentage: number;
  color: string;
}

/** Trend metric card */
export interface TrendMetric {
  label: string;
  value: string;
  direction: 'up' | 'down';
  color: string;
}

/** Report item */
export interface Report {
  id: string;
  title: string;
  category: ReportCategory;
  period: ReportPeriod;
  periodLabel: string;
  description: string;
  exportFormats: ExportFormat[];
}

/** Workspace session */
export interface Workspace {
  id: string;
  analyst: string;
  role: string;
  avatar?: string;
  tag: string;
  tagColor: string;
  title: string;
  timeAgo: string;
  collaborators?: number;
}

/** Sidebar navigation item */
export interface NavItem {
  id: string;
  label: string;
  icon: string;
}
