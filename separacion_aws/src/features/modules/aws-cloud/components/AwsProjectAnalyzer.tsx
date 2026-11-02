import { useState, useRef, useId, useEffect } from 'react';
import {
  FileArchive,
  FolderGit2,
  FileText,
  UploadCloud,
  Check,
  AlertCircle,
  X,
  Loader2,
  CheckCircle2,

  ArrowRight,



  Shield,





  Sparkles,
  Sliders,
  Download,
  Key,
} from 'lucide-react';

import { analyzerService, checkBackendHealth } from '../services/analyzerService';
import { useSubscription } from '../context/SubscriptionContext';
import { useAws } from '../context/AwsContext';
import type {
  AnalyzerInput,
  AnalysisResult,
  CloudProposal,
  ArchitectureScenario,
  EnterpriseEvaluationResponse,
  EvaluationOptions,
} from '../types/awsTypes';

interface AwsProjectAnalyzerProps {
  onApplyToProposal: (draft: {
    appType: CloudProposal['appType'];
    description: string;
    selectedServices: string[];
    monthlyBudget?: number;
    annualBudget?: number;
    region?: string;
    scenarioType?: string;
    reaEvaluation?: EnterpriseEvaluationResponse;
    servicesCostDetails?: Array<{
      serviceName: string;
      codeName: string;
      category: string;
      specs: string;
      monthlyCost: number;
      quantity: number;
    }>;
  }) => void;
}

type TabType = 'zip' | 'github' | 'document';

const REGION_OPTIONS = [
  { code: 'us-east-1', name: 'EE.UU. Este (N. Virginia)' },
  { code: 'us-west-2', name: 'EE.UU. Oeste (Oregón)' },
  { code: 'sa-east-1', name: 'América del Sur (São Paulo)' },
  { code: 'eu-west-1', name: 'Europa (Irlanda)' },
];

const TRAFFIC_TIERS = [
  { id: 'low', label: 'Bajo', desc: '<25k req/mes (MVP / Dev)' },
  { id: 'medium', label: 'Medio', desc: '100k - 500k req/mes (Producción PyME)' },
  { id: 'high', label: 'Alto', desc: '>1M req/mes (Corporativo)' },
  { id: 'enterprise', label: 'Misión Crítica', desc: 'Multi-zona / Cero tolerancia a fallos' },
];

export default function AwsProjectAnalyzer({ onApplyToProposal }: AwsProjectAnalyzerProps) {
  const { serviceCatalog } = useAws();
  const {
    email: trialEmail,
    intentosRestantes,
    planActual,
    openEmailGate,
    openPaywallModal,
  } = useSubscription();
  const fileInputId = useId();
  const [activeTab, setActiveTab] = useState<TabType>('zip');

  // Estado del backend de evaluación
  const [backendHealth, setBackendHealth] = useState<{
    online: boolean;
    service?: string;
    aiEngine?: string;
    geminiActive?: boolean;
    port?: string;
  }>({ online: false });

  // Parámetros de negocio / configuración
  const [trafficTier, setTrafficTier] = useState<string>('medium');
  const [targetRegion, setTargetRegion] = useState<string>('us-east-1');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [githubToken, setGithubToken] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Estado para entrada ZIP
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Estado para entrada GitHub
  const [githubUrl, setGithubUrl] = useState('');

  // Estado para entrada Documento
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docText, setDocText] = useState('');

  // Estado de ejecución del análisis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Escenario de arquitectura actualmente seleccionado
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(1); // 1 = Recommended-Production

  // Checkboxes de servicios seleccionados del escenario activo
  const [selectedServiceCodes, setSelectedServiceCodes] = useState<Set<string>>(new Set());

  // Control de cancelación
  const cancelRequestedRef = useRef(false);

  // Verificar salud del backend al montar
  useEffect(() => {
    checkBackendHealth().then((health) => {
      setBackendHealth(health);
    });
  }, []);

  // Sincronizar servicios recomendados cuando cambia el resultado o el escenario
  useEffect(() => {
    if (!analysisResult) return;

    const evalData = analysisResult.enterpriseEvaluation;
    if (evalData && evalData.scenarios && evalData.scenarios.length > 0) {
      const activeScenario = evalData.scenarios[selectedScenarioIndex] || evalData.scenarios[0];
      const initialCodes = new Set<string>();

      for (const svc of activeScenario.services) {
        const code = svc.service_code || svc.service_name;
        const matched = serviceCatalog.find(
          (cat) =>
            cat.codeName.toLowerCase() === code.toLowerCase() ||
            cat.shortName.toLowerCase() === code.toLowerCase() ||
            cat.name.toLowerCase().includes(svc.service_name.toLowerCase()) ||
            svc.service_name.toLowerCase().includes(cat.shortName.toLowerCase())
        );
        if (matched) {
          initialCodes.add(matched.codeName);
        } else {
          initialCodes.add(svc.service_code || svc.service_name.split(' ')[0]);
        }
      }
      setSelectedServiceCodes(initialCodes);
    } else {
      // Fallback a recomendaciones estándar
      const initialCodes = new Set<string>();
      for (const rec of analysisResult.recommendations) {
        const catSvc = serviceCatalog.find((s) => s.id === rec.serviceId);
        if (catSvc) {
          initialCodes.add(catSvc.codeName);
        }
      }
      setSelectedServiceCodes(initialCodes);
    }
  }, [analysisResult, selectedScenarioIndex]);

  // Manejo de drag & drop para ZIP
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setAnalysisError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setAnalysisError('Formato no válido. Solo se admiten archivos con extensión .zip.');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setAnalysisError('El archivo ZIP excede el tamaño máximo permitido de 50 MB.');
        return;
      }
      setZipFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAnalysisError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (activeTab === 'zip') {
        if (!file.name.toLowerCase().endsWith('.zip')) {
          setAnalysisError('Formato no válido. Solo se admiten archivos .zip.');
          return;
        }
        if (file.size > 50 * 1024 * 1024) {
          setAnalysisError('El archivo ZIP excede el tamaño máximo de 50 MB.');
          return;
        }
        setZipFile(file);
      } else if (activeTab === 'document') {
        if (file.size > 2 * 1024 * 1024) {
          setAnalysisError('El documento supera el tamaño máximo permitido de 2 MB.');
          return;
        }
        setDocFile(file);
      }
    }
  };

  // Validar si hay entrada lista para analizar
  const isInputReady = (): boolean => {
    if (isAnalyzing) return false;
    if (activeTab === 'zip') return zipFile !== null;
    if (activeTab === 'github') return githubUrl.trim().length > 0;
    if (activeTab === 'document') return docFile !== null || docText.trim().length > 0;
    return false;
  };

  // Ejecución del análisis conectando al servicio cloud
  const handleStartAnalysis = async () => {
    // El correo identifica la cuota antes de consumir el motor REA.
    if (!trialEmail) {
      openEmailGate();
      return;
    }

    // El backend sigue siendo la autoridad y el interceptor captura LIMIT_REACHED;
    // este guard evita una espera innecesaria cuando ya conocemos la cuota agotada.
    if (planActual === 'free' && intentosRestantes <= 0) {
      openPaywallModal();
      return;
    }

    setAnalysisError(null);
    setAnalysisResult(null);
    cancelRequestedRef.current = false;
    setIsAnalyzing(true);

    try {
      setAnalysisStep('Iniciando auditoría técnica del proyecto...');

      let input: AnalyzerInput;
      if (activeTab === 'zip') {
        if (!zipFile) throw new Error('Selecciona un archivo ZIP para continuar.');
        input = { kind: 'zip', file: zipFile };
      } else if (activeTab === 'github') {
        const url = githubUrl.trim();
        if (!url.startsWith('https://github.com/')) {
          throw new Error('La URL debe comenzar con https://github.com/usuario/repositorio');
        }
        input = { kind: 'github', url };
      } else {
        if (docFile) {
          input = { kind: 'document', file: docFile };
        } else if (docText.trim()) {
          input = {
            kind: 'document',
            file: { name: 'especificacion.txt', text: docText.trim() },
          };
        } else {
          throw new Error('Adjunta un archivo o escribe la especificación técnica.');
        }
      }

      setAnalysisStep('Detectando artefactos PaaS (Render, Vercel, Docker) y dependencias...');
      await new Promise((r) => setTimeout(r, 400));
      if (cancelRequestedRef.current) return;

      setAnalysisStep('Consultando al motor de arquitectura Cloud (Gemini + REA Agent)...');

      const result = await analyzerService.analyze(input, {
        traffic_tier: trafficTier as NonNullable<EvaluationOptions['traffic_tier']>,
        target_region: targetRegion,
        custom_notes: customNotes,
        github_token: githubToken || undefined,
      });

      if (cancelRequestedRef.current) return;

      setAnalysisStep('Calculando escenarios de dimensionamiento y presupuesto...');
      await new Promise((r) => setTimeout(r, 300));
      if (cancelRequestedRef.current) return;

      setAnalysisResult(result);

      // Si hay escenarios enterprise, seleccionar Recommended-Production (index 1) si existe
      if (result.enterpriseEvaluation?.scenarios) {
        const recIndex = result.enterpriseEvaluation.scenarios.findIndex(
          (s) => s.scenario_type === 'Recommended-Production'
        );
        setSelectedScenarioIndex(recIndex >= 0 ? recIndex : 0);
      }
    } catch (err: unknown) {
      if (!cancelRequestedRef.current) {
        setAnalysisError(err instanceof Error ? err.message : 'Error inesperado durante el análisis.');
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const handleCancel = () => {
    cancelRequestedRef.current = true;
    setIsAnalyzing(false);
    setAnalysisStep('');
  };

  const handleToggleService = (codeName: string) => {
    setSelectedServiceCodes((prev) => {
      const next = new Set(prev);
      if (next.has(codeName)) {
        next.delete(codeName);
      } else {
        next.add(codeName);
      }
      return next;
    });
  };

  const handleDiscard = () => {
    setAnalysisResult(null);
    setAnalysisError(null);
    setZipFile(null);
    setGithubUrl('');
    setDocFile(null);
    setDocText('');
  };

  const handleApply = () => {
    if (!analysisResult) return;

    const evalData = analysisResult.enterpriseEvaluation;
    const currentScenario: ArchitectureScenario | undefined =
      evalData?.scenarios?.[selectedScenarioIndex];

    const validAppType: CloudProposal['appType'] =
      (analysisResult.suggestedAppType as CloudProposal['appType']) || 'Portal Web Empresarial';

    const serviceCostDetails = currentScenario?.services.map((s) => ({
      serviceName: s.service_name,
      codeName: s.service_code || s.service_name,
      category: s.category,
      specs: s.specs,
      monthlyCost: s.total_monthly_usd,
      quantity: s.quantity,
    }));

    onApplyToProposal({
      appType: validAppType,
      description: currentScenario
        ? `${evalData?.system_analysis || analysisResult.suggestedDescription}\n\nEscenario Aplicado: ${currentScenario.scenario_type} - ${currentScenario.summary}\nEstrategia: ${evalData?.migration_strategy || 'Replatform'}`
        : analysisResult.suggestedDescription,
      selectedServices: Array.from(selectedServiceCodes),
      monthlyBudget: currentScenario?.pricing.monthly_total_usd,
      annualBudget: currentScenario?.pricing.annual_total_usd,
      region: targetRegion,
      scenarioType: currentScenario?.scenario_type,
      reaEvaluation: evalData,
      servicesCostDetails: serviceCostDetails,
    });
  };

  const handleDownloadReport = () => {
    if (!analysisResult) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(analysisResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'evaluacion_migracion_aws.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const activeScenario: ArchitectureScenario | undefined =
    analysisResult?.enterpriseEvaluation?.scenarios?.[selectedScenarioIndex];

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Barra de Estado del Backend y Servicios */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: backendHealth.online ? '#10b981' : '#f59e0b',
              boxShadow: backendHealth.online ? '0 0 8px #10b981' : 'none',
            }}
          />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>
            {backendHealth.online
              ? `Servicio Cloud AI Conectado (Puerto ${backendHealth.port || '8080'} · ${backendHealth.aiEngine || 'Gemini + REA Agent'})`
              : 'Conectando con Backend Cloud (puerto 8080)...'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: showAdvanced ? '#eff6ff' : '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 600,
            color: showAdvanced ? '#2563eb' : '#475569',
            cursor: 'pointer',
          }}
        >
          <Sliders size={13} />
          Parámetros de Evaluación ({targetRegion}, {trafficTier})
        </button>
      </div>

      {/* Panel Expandible de Parámetros de Migración */}
      {showAdvanced && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          }}
        >
          {/* Región Destino */}
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Región de Destino AWS
            </label>
            <select
              value={targetRegion}
              onChange={(e) => setTargetRegion(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                background: '#ffffff',
                color: '#1e293b',
              }}
            >
              {REGION_OPTIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          {/* Perfil de Tráfico */}
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Perfil de Tráfico Esperado
            </label>
            <select
              value={trafficTier}
              onChange={(e) => setTrafficTier(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                background: '#ffffff',
                color: '#1e293b',
              }}
            >
              {TRAFFIC_TIERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} — {t.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Token de GitHub Opcional */}
          {activeTab === 'github' && (
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                GitHub Token (Repos Privados)
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={13} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxx (opcional)"
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 28px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    background: '#ffffff',
                  }}
                />
              </div>
            </div>
          )}

          {/* Notas y requerimientos específicos */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Requerimientos y Notas de Arquitectura (Opcional)
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Ej. Cumplir PCI-DSS, alta concurrencia en facturación, mantener PostgreSQL..."
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                background: '#ffffff',
              }}
            />
          </div>
        </div>
      )}

      {/* Pestañas de Selección de Fuente */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div
          style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: 4,
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            gap: 4,
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('zip');
              setAnalysisError(null);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'zip' ? '#2563eb' : 'transparent',
              color: activeTab === 'zip' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            <FileArchive size={16} />
            Paquete ZIP
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('github');
              setAnalysisError(null);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'github' ? '#2563eb' : 'transparent',
              color: activeTab === 'github' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            <FolderGit2 size={16} />
            Repositorio GitHub
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('document');
              setAnalysisError(null);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'document' ? '#2563eb' : 'transparent',
              color: activeTab === 'document' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            <FileText size={16} />
            Documento
          </button>
        </div>

        <span style={{ fontSize: 12, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} color="#2563eb" />
          Auditoría automatizada con 3 escenarios de costos y Well-Architected Framework
        </span>
      </div>

      {/* ÁREA DE ENTRADA SEGÚN LA PESTAÑA */}
      {/* 1. ZIP */}
      {activeTab === 'zip' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: isDragging ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
            background: isDragging ? '#eff6ff' : '#f8fafc',
            borderRadius: 14,
            padding: '32px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
          onClick={() => {
            const inputEl = document.getElementById(fileInputId);
            if (inputEl) inputEl.click();
          }}
        >
          <input
            id={fileInputId}
            type="file"
            accept=".zip"
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: zipFile ? '#dcfce7' : '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: zipFile ? '#16a34a' : '#2563eb',
            }}
          >
            {zipFile ? <CheckCircle2 size={26} /> : <UploadCloud size={26} />}
          </div>
          {zipFile ? (
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{zipFile.name}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                {(zipFile.size / (1024 * 1024)).toFixed(2)} MB — Archivo preparado para evaluar
              </p>
            </div>
          ) : (
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                Arrastra tu archivo .zip aquí o haz clic para examinar
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                Soporta proyectos Render, Vercel, Node, Python, Django, Docker o microservicios (máx. 50 MB)
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2. GITHUB */}
      {activeTab === 'github' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/usuario/repositorio"
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* 3. DOCUMENTO */}
      {activeTab === 'document' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            value={docText}
            onChange={(e) => setDocText(e.target.value)}
            rows={4}
            placeholder="Pega aquí la arquitectura del sistema, dependencias (package.json, requirements.txt, render.yaml) o requerimientos..."
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              fontFamily: 'monospace',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
      )}

      {/* MENSAJE DE ERROR */}
      {analysisError && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            <span>{analysisError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAnalysisError(null)}
            style={{ background: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* BOTÓN PRINCIPAL DE INICIO / PROGRESO */}
      {!analysisResult && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {isAnalyzing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#2563eb', fontWeight: 600 }}>
                <Loader2 size={18} className="animate-spin" />
                <span>{analysisStep}</span>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 12,
                  color: '#64748b',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!isInputReady()}
              onClick={handleStartAnalysis}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: isInputReady() ? '#2563eb' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 22px',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: isInputReady() ? 'pointer' : 'not-allowed',
                boxShadow: isInputReady() ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={16} />
              Evaluar y Dimensionar en AWS
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESULTADOS DE LA EVALUACIÓN EMPRESARIAL */}
      {/* ========================================================================= */}
      {analysisResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 8 }}>
          {/* Cabecera Ejecutiva del Diagnóstico */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              borderRadius: 14,
              padding: 20,
              boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 20,
                  }}
                >
                  Plataforma previa: {analysisResult.enterpriseEvaluation?.origin_detected || 'Detectada'}
                </span>
                <span
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    color: '#93c5fd',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 20,
                  }}
                >
                  Estrategia: {analysisResult.enterpriseEvaluation?.migration_strategy || 'Replatform'}
                </span>
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 20,
                  }}
                >
                  {analysisResult.enterpriseEvaluation?.architecture_pattern || 'Microservicios'}
                </span>
                <span
                  style={{
                    background: analysisResult.enterpriseEvaluation?.ai_generated ? 'rgba(59, 130, 246, 0.25)' : 'rgba(245, 158, 11, 0.2)',
                    color: analysisResult.enterpriseEvaluation?.ai_generated ? '#bfdbfe' : '#fcd34d',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 20,
                  }}
                >
                  {analysisResult.enterpriseEvaluation?.ai_generated
                    ? `IA real: ${analysisResult.enterpriseEvaluation.ai_provider || 'Gemini'}`
                    : 'REA heurístico: IA no disponible'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    padding: '4px 10px',
                    color: '#ffffff',
                    fontSize: 11.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Download size={13} /> JSON
                </button>
                <button
                  type="button"
                  onClick={handleDiscard}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '4px 10px',
                    color: '#cbd5e1',
                    fontSize: 11.5,
                    cursor: 'pointer',
                  }}
                >
                  Reevaluar
                </button>
              </div>
            </div>

            <p style={{ margin: '0 0 10px', fontSize: 13, color: '#bfdbfe', lineHeight: 1.5 }}>
              <strong>Descripción general:</strong>{' '}
              {analysisResult.enterpriseEvaluation?.system_description || analysisResult.enterpriseEvaluation?.system_analysis || analysisResult.suggestedDescription}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
              {analysisResult.enterpriseEvaluation?.system_analysis || analysisResult.suggestedDescription}
            </p>
          </div>

          {/* SELECTOR DE LOS 3 ESCENARIOS DE PRESUPUESTO */}
          {analysisResult.enterpriseEvaluation?.scenarios && analysisResult.enterpriseEvaluation.scenarios.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                    Escenarios y Presupuestos Cloud en AWS
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                    Compara opciones según SLA, tolerancia a fallos y presupuesto mensual.
                  </p>
                </div>
              </div>

              {/* Grid de Pestañas de Escenarios */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {analysisResult.enterpriseEvaluation.scenarios.map((sc, idx) => {
                  const isSelected = selectedScenarioIndex === idx;
                  const isCostOpt = sc.scenario_type.includes('Cost');
                  const isEnterprise = sc.scenario_type.includes('High') || sc.scenario_type.includes('Enterprise');

                  let themeColor = '#2563eb';
                  let badgeText = 'Recomendado';
                  if (isCostOpt) {
                    themeColor = '#10b981';
                    badgeText = 'Económico';
                  } else if (isEnterprise) {
                    themeColor = '#8b5cf6';
                    badgeText = 'Misión Crítica';
                  }

                  return (
                    <div
                      key={sc.scenario_type}
                      onClick={() => setSelectedScenarioIndex(idx)}
                      style={{
                        background: isSelected ? '#ffffff' : '#f8fafc',
                        border: isSelected ? `2px solid ${themeColor}` : '1px solid #e2e8f0',
                        borderRadius: 14,
                        padding: 16,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? `0 4px 14px ${themeColor}20` : 'none',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: `${themeColor}15`,
                            color: themeColor,
                          }}
                        >
                          {badgeText}
                        </span>
                        {isSelected && <Check size={16} color={themeColor} strokeWidth={3} />}
                      </div>

                      <h5 style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                        {sc.scenario_type.replace(/-/g, ' ')}
                      </h5>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0' }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: themeColor }}>
                          ${sc.pricing.monthly_total_usd.toFixed(2)}
                        </span>
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>USD / mes</span>
                      </div>

                      <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                        ${sc.pricing.annual_total_usd.toLocaleString()} USD / año · {sc.services.length} servicios
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Detalle del Escenario Seleccionado */}
              {activeScenario && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Detalle del Escenario
                      </span>
                      <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#334155', fontWeight: 500 }}>
                        {activeScenario.summary}
                      </p>
                    </div>
                  </div>

                  {/* Tabla / Lista de Servicios Dimensionados */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                      Servicios AWS Aprovisionados ({activeScenario.services.length}):
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                      {activeScenario.services.map((svc, i) => {
                        const code = svc.service_code || svc.service_name.split(' ')[0];
                        const isChecked = selectedServiceCodes.has(code);

                        return (
                          <div
                            key={i}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: 10,
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleService(code)}
                                style={{ width: 16, height: 16, accentColor: '#2563eb', cursor: 'pointer' }}
                              />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <strong style={{ fontSize: 13, color: '#0f172a' }}>{svc.service_name}</strong>
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      background: '#f1f5f9',
                                      color: '#475569',
                                      padding: '1px 6px',
                                      borderRadius: 6,
                                    }}
                                  >
                                    {svc.category}
                                  </span>
                                </div>
                                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#64748b' }}>
                                  {svc.role} · <span style={{ color: '#0f172a', fontWeight: 500 }}>{svc.specs}</span>
                                </p>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                                ${(svc.total_monthly_usd || svc.estimated_unit_cost_usd * svc.quantity).toFixed(2)}
                              </span>
                              <span style={{ fontSize: 10.5, color: '#64748b', display: 'block' }}>
                                ({svc.quantity}x @ ${svc.estimated_unit_cost_usd.toFixed(2)}/mes)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Observaciones del Well-Architected Framework */}
          {analysisResult.enterpriseEvaluation?.well_architected_notes &&
            analysisResult.enterpriseEvaluation.well_architected_notes.length > 0 && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Shield size={16} color="#16a34a" />
                  <strong style={{ fontSize: 13, color: '#166534' }}>
                    Buenas Prácticas AWS Well-Architected Framework
                  </strong>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#14532d', lineHeight: 1.5 }}>
                  {analysisResult.enterpriseEvaluation.well_architected_notes.map((note, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* BOTONES DE ACCIÓN FINAL */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 12,
              borderTop: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Servicios seleccionados para registrar:{' '}
              <strong style={{ color: '#0f172a' }}>{selectedServiceCodes.size} servicios</strong>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={handleDiscard}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '9px 16px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Descartar
              </button>

              <button
                type="button"
                onClick={handleApply}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 22px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                }}
              >
                <span>Aplicar este Escenario a la Propuesta y Presupuesto</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
