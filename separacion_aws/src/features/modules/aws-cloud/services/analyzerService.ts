import type {
  AnalyzerInput,
  AnalysisResult,
  DetectedTech,
  EnterpriseEvaluationResponse,
  EvaluationOptions,
  ServiceRecommendation,
} from '../types/awsTypes';
import { fetchWithSubscriptionGuard } from './subscriptionInterceptor';
import { getApiBaseUrl } from './apiClient';

export interface AnalyzerService {
  analyze(input: AnalyzerInput, options?: EvaluationOptions): Promise<AnalysisResult>;
}

export async function getBackendBaseUrl(): Promise<string> {
  return getApiBaseUrl();
}

export async function checkBackendHealth(): Promise<{
  online: boolean;
  service?: string;
  aiEngine?: string;
  geminiActive?: boolean;
  port?: string;
}> {
  try {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/migration-evaluator/status`);
    if (!response.ok) return { online: false };
    const data = await response.json();
    return { online: true, service: data.service, aiEngine: data.ai_engine, geminiActive: data.gemini_active, port: new URL(baseUrl).port };
  } catch {
    return { online: false };
  }
}

function sourceLabel(input: AnalyzerInput): string {
  if (input.kind === 'zip') return `Paquete ZIP (${input.file.name})`;
  if (input.kind === 'github') return `GitHub (${input.url.replace(/^https?:\/\/github\.com\//, '')})`;
  return `Documento (${input.file.name})`;
}

function mapEvaluation(input: AnalyzerInput, rawEval: EnterpriseEvaluationResponse): AnalysisResult {
  const detected: DetectedTech[] = [];
  const recommendations: ServiceRecommendation[] = [];
  const evidence = rawEval.technical_evidence;

  (evidence?.languages || []).forEach((name, index) => detected.push({ id: `lang-${index}`, name, category: 'backend', evidence: { file: 'Código fuente', match: `Lenguaje: ${name}` } }));
  (evidence?.frameworks || []).forEach((name, index) => detected.push({ id: `framework-${index}`, name, category: 'other', evidence: { file: 'Dependencias', match: `Framework: ${name}` } }));
  (evidence?.databases || []).forEach((name, index) => detected.push({ id: `database-${index}`, name, category: 'database', evidence: { file: 'Persistencia', match: `Base de datos: ${name}` } }));
  if (evidence?.has_docker) detected.push({ id: 'docker', name: 'Docker / Contenedores', category: 'container', evidence: { file: 'Dockerfile', match: 'Contenedorización detectada por el backend' } });
  if (rawEval.origin_detected) detected.unshift({ id: 'origin', name: rawEval.origin_detected, category: 'other', evidence: { file: rawEval.detected_configs?.join(', ') || 'Configuraciones', match: `Origen: ${rawEval.origin_detected}` } });

  const primaryScenario = rawEval.scenarios?.find((item) => item.scenario_type === 'Recommended-Production') || rawEval.scenarios?.[0];
  (primaryScenario?.services || []).forEach((service) => recommendations.push({ serviceId: service.service_code || service.service_name, reason: `${service.role} (${service.specs}). ${service.reason}`, triggeredBy: [rawEval.architecture_pattern || 'Arquitectura detectada'] }));

  const pattern = (rawEval.architecture_pattern || '').toLowerCase();
  const suggestedAppType = pattern.includes('microservicio') || pattern.includes('api') ? 'Microservicios Cloud' : pattern.includes('serverless') ? 'API REST / Backend' : pattern.includes('e-commerce') || pattern.includes('retail') ? 'E-commerce & Retail' : 'Portal Web Empresarial';

  return {
    source: sourceLabel(input),
    filesAnalyzed: evidence?.total_files || 1,
    detected,
    recommendations,
    unsupported: [],
    suggestedAppType,
    suggestedDescription: `${rawEval.system_analysis}\n\nEstrategia de Migración: ${rawEval.migration_strategy}`,
    warnings: rawEval.well_architected_notes || [],
    enterpriseEvaluation: rawEval,
  };
}

export const remoteAnalyzer: AnalyzerService = {
  async analyze(input: AnalyzerInput, options?: EvaluationOptions): Promise<AnalysisResult> {
    const baseUrl = await getApiBaseUrl();
    const trafficTier = options?.traffic_tier || 'medium';
    const targetRegion = options?.target_region || 'sa-east-1';
    const customNotes = options?.custom_notes || '';
    let response: Response;

    if (input.kind === 'zip') {
      const formData = new FormData();
      formData.append('file', input.file);
      formData.append('traffic_tier', trafficTier);
      formData.append('target_region', targetRegion);
      if (customNotes) formData.append('custom_notes', customNotes);
      response = await fetchWithSubscriptionGuard(`${baseUrl}/migration-evaluator/evaluate-zip`, { method: 'POST', body: formData });
    } else if (input.kind === 'github') {
      response = await fetchWithSubscriptionGuard(`${baseUrl}/migration-evaluator/evaluate-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: input.url, github_token: options?.github_token || undefined, traffic_tier: trafficTier, target_region: targetRegion, custom_notes: customNotes || undefined }),
      });
    } else {
      const file = input.file as File | { name: string; text: string };
      const content = typeof file.text === 'string' ? file.text : await file.text();
      response = await fetchWithSubscriptionGuard(`${baseUrl}/migration-evaluator/evaluate-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: input.file.name, content, traffic_tier: trafficTier, target_region: targetRegion, custom_notes: customNotes || undefined }),
      });
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof data.detail === 'object' ? data.detail : data;
      throw new Error(detail.message || detail.detail || `El backend rechazó la evaluación (${response.status}).`);
    }
    return mapEvaluation(input, data as EnterpriseEvaluationResponse);
  },
};

export const analyzerService: AnalyzerService = {
  async analyze(input, options) {
    return remoteAnalyzer.analyze(input, options);
  },
};
