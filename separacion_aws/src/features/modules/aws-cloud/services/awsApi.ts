import type { AwsRegionInfo, AwsService, CloudProposal, CostSimulationItem, PricingUnit } from '../types/awsTypes';
import { apiFetch } from './apiClient';

export interface BackendSecurityPosture {
  rootBlocked: boolean;
  mfaEnforced: boolean;
  ec2Roles: boolean;
  tls13: boolean;
  s3EncryptionAndVersioning: boolean;
  complianceAudits: boolean;
  proposal_id?: string | null;
  security_score: number;
  posture_label: string;
  recommended_iam_roles: string[];
}

export interface BackendRegion {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

export interface BackendCatalogEntry {
  service_name: string;
  category: string;
  role: string;
  specs: string;
  unit_cost: number;
  reason: string;
}

export interface BackendCatalogResponse {
  hours_per_month: number;
  currency: string;
  total_services: number;
  catalog: Record<string, BackendCatalogEntry>;
}

export interface BackendDiagram {
  id: string;
  proposal_id: string;
  diagram_type: string;
  region_snapshot: string;
  drawio_xml: string;
  reactflow_graph?: { nodes?: unknown[]; edges?: unknown[]; metadata?: Record<string, unknown> } | null;
  rea_evaluation?: any;
  reaEvaluation?: any;
  updated_at?: string;
}

export interface AdvisorResponse {
  text: string;
  timestamp: string;
  details_card?: {
    title: string;
    badge: string;
    badgeColor?: string;
    items: { label: string; value: string }[];
    pros?: string[];
    note?: string;
  };
  action?: { type: string; label: string; payload: any };
}

const serviceCategory = (category: string): AwsService['category'] => {
  const allowed: AwsService['category'][] = ['Cómputo', 'Almacenamiento', 'Base de Datos', 'Redes y CDN', 'Seguridad e Identidad', 'Serverless', 'Monitoreo y Gestión', 'Analítica'];
  return allowed.includes(category as AwsService['category']) ? category as AwsService['category'] : 'Cómputo';
};

export function mapProposal(raw: any): CloudProposal {
  const selectedServices = raw.selectedServices || raw.selected_services || [];
  const mapped = {
    id: raw.id,
    solutionName: raw.solutionName || raw.solution_name,
    appType: raw.appType || raw.app_type,
    description: raw.description || '',
    region: raw.region || 'sa-east-1',
    estimatedUsers: Number(raw.estimatedUsers ?? raw.estimated_users ?? 0),
    availabilityLevel: raw.availabilityLevel || raw.availability_level,
    selectedServices,
    services: selectedServices,
    migrationGoal: raw.migrationGoal || raw.migration_goal,
    monthlyBudget: Number(raw.monthlyBudget ?? raw.monthly_budget ?? 0),
    annualBudget: Number(raw.annualBudget ?? raw.annual_budget ?? 0),
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    status: raw.status || 'Borrador',
    appliedScenario: raw.appliedScenario || raw.applied_scenario,
    reaEvaluation: raw.reaEvaluation || raw.rea_evaluation,
    securityControls: raw.securityControls || raw.security_controls,
  } as CloudProposal;

  // La lista de propuestas ya incluye el desglose persistido. Se conserva
  // como metadato interno para que el dashboard no tenga que reconstruirlo
  // desde datos de ejemplo ni hacer una segunda fuente de estado local.
  (mapped as CloudProposal & { costItems?: CostSimulationItem[] }).costItems =
    (raw.costItems || raw.cost_items || []).map(mapCostItem);
  return mapped;
}

export function mapCostItem(raw: any): CostSimulationItem {
  return {
    id: raw.id,
    serviceId: raw.service_id || raw.serviceId,
    serviceName: raw.service_name || raw.serviceName,
    category: serviceCategory(raw.category),
    instanceTypeOrTier: raw.instance_type_or_tier || raw.instanceTypeOrTier || '',
    quantity: Number(raw.quantity ?? 1),
    hoursPerMonth: Number(raw.hours_per_month ?? raw.hoursPerMonth ?? 730),
    unit: raw.unit as PricingUnit | undefined,
    unitPrice: Number(raw.unit_price ?? raw.unitPrice ?? 0),
    costPerHour: Number(raw.cost_per_hour ?? raw.costPerHour ?? 0),
    monthlyCost: Number(raw.monthly_cost ?? raw.monthlyCost ?? 0),
    annualCost: Number(raw.annual_cost ?? raw.annualCost ?? 0),
  };
}

export function mapCatalog(response: BackendCatalogResponse): AwsService[] {
  return Object.entries(response.catalog).map(([codeName, entry]) => ({
    id: `aws-${codeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: entry.service_name,
    shortName: codeName,
    codeName,
    category: serviceCategory(entry.category),
    description: entry.role,
    mainFunction: entry.reason,
    pricing: {
      unit: 'hour',
      price: Number(entry.unit_cost || 0) / Number(response.hours_per_month || 730),
      unitLabel: `$${Number(entry.unit_cost || 0).toFixed(2)} / mes`,
      note: entry.specs,
    },
    estimatedCostPerHour: Number(entry.unit_cost || 0) / Number(response.hours_per_month || 730),
    useCase: entry.specs,
  }));
}

export function mapRegion(raw: BackendRegion): AwsRegionInfo {
  const continent = raw.name.includes('América') ? 'América del Sur' : raw.name.includes('Europa') ? 'Europa' : raw.name.includes('Asia') ? 'Asia-Pacífico' : 'América del Norte';
  return {
    code: raw.code,
    name: raw.name,
    location: raw.name,
    continent,
    flag: '🌐',
    availabilityZones: 0,
    activeServicesCount: 0,
    status: 'Operacional',
    latencyMs: 0,
    isPrimary: raw.code === 'sa-east-1',
    coordinates: { x: 50, y: 50, lat: raw.lat, lng: raw.lng },
  };
}

export const awsApi = {
  listProposals: () => apiFetch<any[]>('/proposals'),
  getProposal: (id: string) => apiFetch<any>(`/proposals/${id}`),
  createProposal: (payload: unknown) => apiFetch<any>('/proposals', { method: 'POST', body: JSON.stringify(payload) }),
  updateProposal: (id: string, payload: unknown) => apiFetch<any>(`/proposals/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProposal: (id: string) => apiFetch<{ deleted: boolean; id: string }>(`/proposals/${id}`, { method: 'DELETE' }),
  catalog: () => apiFetch<BackendCatalogResponse>('/costs/catalog'),
  costs: (id: string) => apiFetch<any[]>(`/proposals/${id}/costs`),
  recalculateCosts: (id: string, selected_services: string[], traffic_tier = 'medium', region = 'sa-east-1') => apiFetch<any>(`/proposals/${id}/costs/recalculate`, { method: 'POST', body: JSON.stringify({ selected_services, traffic_tier, region, scenario_type: 'Recommended-Production' }) }),
  getSecurity: (id: string) => apiFetch<BackendSecurityPosture>(`/proposals/${id}/security`),
  updateSecurity: (id: string, payload: Record<string, unknown>) => apiFetch<BackendSecurityPosture>(`/proposals/${id}/security`, { method: 'PATCH', body: JSON.stringify(payload) }),
  evaluateSecurity: (payload: Record<string, unknown>) => apiFetch<BackendSecurityPosture>('/security/evaluate', { method: 'POST', body: JSON.stringify(payload) }),
  regions: () => apiFetch<BackendRegion[]>('/regions'),
  migrateRegion: (id: string, toRegion: string, fromRegion?: string, migratedServices?: string[]) => apiFetch<any>(`/proposals/${id}/migrate-region`, { method: 'POST', body: JSON.stringify({ toRegion, fromRegion, migratedServices }) }),
  getDiagram: (id: string) => apiFetch<BackendDiagram>(`/proposals/${id}/diagrams/drawio`),
  saveDiagram: (id: string, payload: { drawioXml?: string; regionSnapshot?: string; reactflowGraph?: unknown }) => apiFetch<BackendDiagram & { saved: boolean }>(`/proposals/${id}/diagrams/drawio`, { method: 'PUT', body: JSON.stringify(payload) }),
  advisorQuery: (payload: Record<string, unknown>) => apiFetch<AdvisorResponse>('/advisor/query', { method: 'POST', body: JSON.stringify(payload) }),
};
