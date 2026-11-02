// ==========================================
// Cloud Foundations — AWS Types & Interfaces
// ==========================================

export type ServiceCategory =
  | 'Cómputo'
  | 'Almacenamiento'
  | 'Base de Datos'
  | 'Redes y CDN'
  | 'Seguridad e Identidad'
  | 'Serverless'
  | 'Monitoreo y Gestión'
  | 'Analítica';

export type PricingUnit =
  | 'hour'
  | 'gb-month'
  | 'gb-transfer'
  | 'million-requests'
  | 'hosted-zone-month'
  | 'metric-month'
  | 'free';

export interface ServicePricing {
  unit: PricingUnit;
  price: number;
  unitLabel: string;
  note?: string;
}

export interface AwsService {
  id: string;
  name: string;
  shortName: string;
  codeName: string;
  category: ServiceCategory;
  description: string;
  mainFunction: string;
  pricing: ServicePricing;
  status?: 'Activo' | 'Planificado' | 'Disponible' | 'En Mantenimiento';
  iconType?: 'server' | 'database' | 'hard-drive' | 'network' | 'shield' | 'zap' | 'activity' | 'globe';
  pricingUnit?: string;
  estimatedCostPerHour?: number;
  freeTierEligible?: boolean;
  slaPercent?: number;
  useCase?: string;
}

export interface CloudProposal {
  id: string;
  solutionName: string;
  appType: 'E-commerce & Retail' | 'API REST / Backend' | 'Microservicios Cloud' | 'Data Lake & Analítica' | 'Portal Web Empresarial';
  description: string;
  region: string;
  estimatedUsers: number;
  availabilityLevel: '99.9% (Básico Multi-AZ)' | '99.95% (Alta Disponibilidad)' | '99.99% (Misión Crítica Multi-Región)';
  selectedServices: string[]; // List of service codeNames
  migrationGoal: 'Modernización de Aplicación' | 'Reducción de Costos' | 'Escalabilidad Elástica' | 'Continuidad de Negocio y DR';
  monthlyBudget: number;
  annualBudget: number;
  createdAt: string;
  status: 'Aprobada' | 'En Revisión' | 'Borrador' | 'Rechazada' | 'Requiere Ajustes';
  services?: string[]; // Alias compatible para selectedServices
  appliedScenario?: string;
  reaEvaluation?: EnterpriseEvaluationResponse;
  securityControls?: {
    rootBlocked: boolean;
    mfaEnforced: boolean;
    ec2Roles: boolean;
    tls13: boolean;
    s3EncryptionAndVersioning: boolean;
    complianceAudits: boolean;
    [key: string]: boolean;
  };
}

export type AwsProposal = CloudProposal;
export type AwsServiceItem = AwsService;

export interface CostSimulationItem {
  id: string;
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  instanceTypeOrTier: string;
  quantity: number;
  hoursPerMonth: number;
  unit?: PricingUnit;
  unitPrice?: number;
  formulaText?: string;
  costPerHour?: number;
  monthlyCost: number;
  annualCost: number;
}

export interface AwsRegionInfo {
  code: string;
  name: string;
  location: string;
  continent?: string;
  flag: string;
  availabilityZones: number;
  activeServicesCount: number;
  status: 'Operacional' | 'Mantenimiento';
  latencyMs: number;
  isPrimary: boolean;
  coordinates: { x: number; y: number; lat: number; lng: number }; // Relative percentage (x,y) and Geographic coordinates (lat,lng)
  edgeLocationsCount?: number;
  launchedYear?: number;
  complianceList?: string[];
}

export interface SecurityResponsibilityItem {
  id: string;
  domain: string;
  awsResponsibility: string;
  customerResponsibility: string;
  customerStatus: 'correct' | 'review' | 'problem'; // verde, amarillo, rojo
  statusLabel: string;
  recommendation: string;
}

export interface NetworkNodeInfo {
  id: string;
  label: string;
  sublabel: string;
  type: 'internet' | 'route53' | 'cloudfront' | 'vpc' | 'subnet-public' | 'subnet-private' | 'ec2' | 'rds';
  icon: string;
  details: string;
  securityGroup: string;
  status: 'active' | 'standby';
}

export type { RegionOperationalStatus, RegionStatusDetails } from '../data/awsRegionsData';

// ==========================================
// Tipos para el Analizador de Migración a AWS
// ==========================================

export type AnalyzerInput =
  | { kind: 'zip'; file: File }
  | { kind: 'github'; url: string }
  | { kind: 'document'; file: File | { name: string; text: string } };

export interface DetectedTech {
  id: string;
  name: string;
  category: 'frontend' | 'backend' | 'database' | 'storage' | 'container' | 'other';
  evidence: {
    file: string;
    match: string;
  };
}

export interface ServiceRecommendation {
  serviceId: string;
  reason: string;
  triggeredBy: string[];
}

export interface UnsupportedTech {
  name: string;
  suggestedAwsService: string;
  note: string;
}

export interface AnalysisResult {
  source: string;
  filesAnalyzed: number;
  detected: DetectedTech[];
  recommendations: ServiceRecommendation[];
  unsupported: UnsupportedTech[];
  suggestedAppType: string;
  suggestedDescription: string;
  warnings: string[];
  enterpriseEvaluation?: EnterpriseEvaluationResponse;
}

// ==========================================
// Tipos para Evaluación Empresarial Cloud (Backend + REA)
// ==========================================

export interface BackendAwsServiceItem {
  service_name: string;
  service_code?: string;
  category: string;
  role: string;
  specs: string;
  quantity: number;
  estimated_unit_cost_usd: number;
  total_monthly_usd: number;
  reason: string;
}

export interface ScenarioPricing {
  monthly_total_usd: number;
  annual_total_usd: number;
  currency: string;
}

export interface ArchitectureScenario {
  scenario_type: 'Cost-Optimized' | 'Recommended-Production' | 'High-Availability-Enterprise' | string;
  summary: string;
  services: BackendAwsServiceItem[];
  pricing: ScenarioPricing;
}

export interface EnterpriseEvaluationResponse {
  status: 'success' | 'error';
  origin_detected: string;
  detected_configs: string[];
  system_description: string;
  system_analysis: string;
  architecture_pattern: string;
  migration_strategy: string;
  well_architected_notes: string[];
  scenarios: ArchitectureScenario[];
  technical_evidence?: {
    languages?: string[];
    frameworks?: string[];
    databases?: string[];
    has_docker?: boolean;
    total_files?: number;
  };
  ai_generated?: boolean;
  ai_provider?: string;
  ai_fallback_reason?: string;
}

export interface EvaluationOptions {
  traffic_tier?: 'low' | 'medium' | 'high' | 'enterprise';
  target_region?: string;
  custom_notes?: string;
  github_token?: string;
}
