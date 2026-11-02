import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AwsRegionInfo, AwsService, CloudProposal, CostSimulationItem } from '../types/awsTypes';
import { awsApi, mapCatalog, mapCostItem, mapProposal, mapRegion, type BackendSecurityPosture } from '../services/awsApi';

export interface SecurityControls {
  rootBlocked: boolean;
  mfaEnforced: boolean;
  ec2Roles: boolean;
  tls13: boolean;
  s3EncryptionAndVersioning: boolean;
  complianceAudits: boolean;
  [key: string]: boolean;
}

const DEFAULT_SECURITY_CONTROLS: SecurityControls = {
  rootBlocked: false,
  mfaEnforced: false,
  ec2Roles: false,
  tls13: false,
  s3EncryptionAndVersioning: false,
  complianceAudits: false,
};

export interface AwsContextType {
  proposal: CloudProposal | null;
  services: string[];
  costItems: CostSimulationItem[];
  securityControls: SecurityControls;
  serviceCatalog: AwsService[];
  regions: AwsRegionInfo[];
  isLoading: boolean;
  apiError: string | null;
  region: string;
  selectedRegion: string;
  deployedServices: string[];
  totalMonthlyCost: number;
  totalAnnualCost: number;
  securityScore: number;
  slaPercent: number;
  activeProposal: CloudProposal | null;
  proposals: CloudProposal[];
  activeProposalId: string | null;
  createProposal: (proposalData: Omit<CloudProposal, 'id' | 'createdAt'>) => void;
  updateProposal: (partial: Partial<CloudProposal>) => void;
  addService: (codeName: string) => void;
  removeService: (codeName: string) => void;
  replaceServices: (codeNames: string[]) => void;
  toggleService: (codeName: string) => void;
  addCostItem: (item: Omit<CostSimulationItem, 'id'>) => void;
  removeCostItem: (id: string) => void;
  toggleControl: (controlId: string) => void;
  resetAll: () => void;
  addProposal: (proposalData: Omit<CloudProposal, 'id' | 'createdAt'>) => void;
  deleteProposal: (id: string) => void;
  setActiveProposalId: (id: string | null) => void;
  deleteCostItem: (id: string) => void;
  clearCostItems: () => void;
  setSelectedRegion: (region: string) => void;
  toggleSecurityControl: (key: string) => void;
  setAllSecurityControls: (controls: Partial<SecurityControls>) => void;
  addServiceToArchitecture: (codeName: string) => void;
  removeServiceFromArchitecture: (codeName: string) => void;
  syncCostsFromProposal: (proposal: CloudProposal) => void;
  resetAllToEmpty: () => void;
  refreshData: () => Promise<void>;
}

const AwsContext = createContext<AwsContextType | undefined>(undefined);

const toBackendProposal = (partial: Partial<CloudProposal>) => ({
  ...(partial.solutionName !== undefined ? { solutionName: partial.solutionName } : {}),
  ...(partial.appType !== undefined ? { appType: partial.appType } : {}),
  ...(partial.description !== undefined ? { description: partial.description } : {}),
  ...(partial.region !== undefined ? { region: partial.region.split(' ')[0] } : {}),
  ...(partial.estimatedUsers !== undefined ? { estimatedUsers: partial.estimatedUsers } : {}),
  ...(partial.availabilityLevel !== undefined ? { availabilityLevel: partial.availabilityLevel } : {}),
  ...(partial.selectedServices !== undefined ? { selectedServices: partial.selectedServices } : {}),
  ...(partial.migrationGoal !== undefined ? { migrationGoal: partial.migrationGoal } : {}),
  ...(partial.monthlyBudget !== undefined ? { monthlyBudget: partial.monthlyBudget } : {}),
  ...(partial.annualBudget !== undefined ? { annualBudget: partial.annualBudget } : {}),
  ...(partial.status !== undefined ? { status: partial.status } : {}),
  ...(partial.appliedScenario !== undefined ? { appliedScenario: partial.appliedScenario } : {}),
  ...(partial.reaEvaluation !== undefined ? { reaEvaluation: partial.reaEvaluation } : {}),
});

function securityFromProposal(proposal: CloudProposal | null): SecurityControls {
  return { ...DEFAULT_SECURITY_CONTROLS, ...(proposal?.securityControls || {}) };
}

function controlsFromPosture(posture: BackendSecurityPosture): SecurityControls {
  return {
    rootBlocked: posture.rootBlocked,
    mfaEnforced: posture.mfaEnforced,
    ec2Roles: posture.ec2Roles,
    tls13: posture.tls13,
    s3EncryptionAndVersioning: posture.s3EncryptionAndVersioning,
    complianceAudits: posture.complianceAudits,
  };
}

function posturePayload(controls: SecurityControls, services: string[]) {
  return { ...controls, selected_services: services } as any;
}

function regionCode(value: string): string {
  return value.trim().split(/\s+/)[0] || value;
}

export const AwsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [proposals, setProposals] = useState<CloudProposal[]>([]);
  const [activeProposalId, setActiveProposalIdState] = useState<string | null>(null);
  const [draftServices, setDraftServices] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<AwsService[]>([]);
  const [regions, setRegions] = useState<AwsRegionInfo[]>([]);
  const [costItems, setCostItems] = useState<CostSimulationItem[]>([]);
  const [securityControls, setSecurityControls] = useState<SecurityControls>(DEFAULT_SECURITY_CONTROLS);
  const [securityScore, setSecurityScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const proposal = useMemo(() => proposals.find((item) => item.id === activeProposalId) || proposals[0] || null, [activeProposalId, proposals]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [proposalRows, catalogResponse, regionRows] = await Promise.all([awsApi.listProposals(), awsApi.catalog(), awsApi.regions()]);
      const mapped = proposalRows.map(mapProposal);
      setProposals(mapped);
      setCatalog(mapCatalog(catalogResponse));
      setRegions(regionRows.map(mapRegion));
      setActiveProposalIdState((current) => (current && mapped.some((item) => item.id === current) ? current : mapped[0]?.id || null));
      const selected = mapped.find((item) => item.id === activeProposalId) || mapped[0];
      if (selected) {
        setCostItems((selected as any).costItems || []);
        setSecurityControls(securityFromProposal(selected));
        const security = await awsApi.getSecurity(selected.id).catch(() => null);
        if (security) {
          setSecurityControls(controlsFromPosture(security));
          setSecurityScore(security.security_score);
        }
      } else {
        setCostItems([]);
        setDraftServices([]);
        setSecurityControls(DEFAULT_SECURITY_CONTROLS);
        setSecurityScore(0);
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'No se pudo cargar el dashboard desde el backend.');
      setProposals([]);
      setCatalog([]);
      setRegions([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeProposalId]);

  useEffect(() => { void refreshData(); }, []);

  useEffect(() => {
    if (!proposal) return;
    setCostItems((proposal as any).costItems || costItems);
    setSecurityControls(securityFromProposal(proposal));
  }, [proposal?.id]);

  const services = proposal?.selectedServices || draftServices;
  const region = proposal?.region || '';
  const totalMonthlyCost = useMemo(() => +costItems.reduce((sum, item) => sum + Number(item.monthlyCost || 0), 0).toFixed(2), [costItems]);
  const totalAnnualCost = useMemo(() => +(totalMonthlyCost * 12).toFixed(2), [totalMonthlyCost]);
  const slaPercent = useMemo(() => Number((proposal?.availabilityLevel || '').match(/99\.\d+/)?.[0] || 0), [proposal?.availabilityLevel]);

  const updateLocalProposal = useCallback((next: CloudProposal) => {
    setProposals((current) => current.map((item) => item.id === next.id ? next : item));
  }, []);

  const createProposal = useCallback((proposalData: Omit<CloudProposal, 'id' | 'createdAt'>) => {
    void (async () => {
      try {
        const created = await awsApi.createProposal(toBackendProposal(proposalData));
        const next = mapProposal(created);
        setProposals((current) => [next, ...current]);
        setActiveProposalIdState(next.id);
        setDraftServices([]);
        setCostItems((created.cost_items || created.costItems || []).map(mapCostItem));
        setSecurityControls(securityFromProposal(next));
        setApiError(null);
      } catch (error) {
        setApiError(error instanceof Error ? error.message : 'No se pudo crear la propuesta.');
      }
    })();
  }, []);

  const updateProposal = useCallback((partial: Partial<CloudProposal>) => {
    if (!proposal) return;
    const optimistic = { ...proposal, ...partial, selectedServices: partial.selectedServices || proposal.selectedServices };
    updateLocalProposal(optimistic);
    void (async () => {
      try {
        const saved = await awsApi.updateProposal(proposal.id, toBackendProposal(partial));
        updateLocalProposal(mapProposal(saved));
        if (partial.securityControls) {
          const posture = await awsApi.updateSecurity(proposal.id, posturePayload({ ...securityControls, ...partial.securityControls }, optimistic.selectedServices));
          setSecurityControls(controlsFromPosture(posture));
          setSecurityScore(posture.security_score);
        }
      } catch (error) {
        setApiError(error instanceof Error ? error.message : 'No se pudo guardar la propuesta.');
      }
    })();
  }, [proposal, securityControls, updateLocalProposal]);

  const recalculateCosts = useCallback((selectedServices: string[]) => {
    if (!proposal) return;
    void awsApi.recalculateCosts(proposal.id, selectedServices, 'medium', regionCode(proposal.region)).then((result) => {
      setCostItems((result.items || []).map(mapCostItem));
      updateLocalProposal({ ...proposal, selectedServices, services: selectedServices, monthlyBudget: result.monthly_total_usd, annualBudget: result.annual_total_usd });
    }).catch((error) => setApiError(error instanceof Error ? error.message : 'No se pudieron recalcular los costos.'));
  }, [proposal, updateLocalProposal]);

  const addService = useCallback((codeName: string) => {
    if (services.includes(codeName)) return;
    const nextServices = [...services, codeName];
    if (!proposal) {
      setDraftServices((current) => current.includes(codeName) ? current : [...current, codeName]);
      return;
    }
    updateProposal({ selectedServices: nextServices });
    recalculateCosts(nextServices);
  }, [proposal, services, updateProposal, recalculateCosts]);

  const removeService = useCallback((codeName: string) => {
    const nextServices = services.filter((item) => item.toLowerCase() !== codeName.toLowerCase());
    if (!proposal) {
      setDraftServices((current) => current.filter((item) => item.toLowerCase() !== codeName.toLowerCase()));
      return;
    }
    updateProposal({ selectedServices: nextServices });
    recalculateCosts(nextServices);
  }, [proposal, services, updateProposal, recalculateCosts]);

  const replaceServices = useCallback((codeNames: string[]) => {
    const nextServices = Array.from(new Set(codeNames.filter((code) => code.trim())));
    if (!proposal) {
      setDraftServices(nextServices);
      return;
    }
    updateProposal({ selectedServices: nextServices });
    recalculateCosts(nextServices);
  }, [proposal, updateProposal, recalculateCosts]);

  const toggleService = useCallback((codeName: string) => {
    if (services.some((item) => item.toLowerCase() === codeName.toLowerCase())) removeService(codeName);
    else addService(codeName);
  }, [services, addService, removeService]);

  const updateSecurity = useCallback((next: SecurityControls) => {
    setSecurityControls(next);
    if (!proposal) return;
    void awsApi.updateSecurity(proposal.id, posturePayload(next, services)).then((posture: BackendSecurityPosture) => {
      setSecurityControls(controlsFromPosture(posture));
      setSecurityScore(posture.security_score);
      updateLocalProposal({ ...proposal, securityControls: controlsFromPosture(posture) });
    }).catch((error) => setApiError(error instanceof Error ? error.message : 'No se pudo guardar la seguridad IAM.'));
  }, [proposal, services, updateLocalProposal]);

  const toggleControl = useCallback((controlId: string) => {
    updateSecurity({ ...securityControls, [controlId]: !securityControls[controlId] });
  }, [securityControls, updateSecurity]);

  const setAllSecurityControls = useCallback((controls: Partial<SecurityControls>) => {
    updateSecurity({ ...securityControls, ...controls } as SecurityControls);
  }, [securityControls, updateSecurity]);

  const setSelectedRegion = useCallback((value: string) => {
    if (!proposal) return;
    const target = regionCode(value);
    void awsApi.migrateRegion(proposal.id, target, regionCode(proposal.region), services).then(() => {
      const next = { ...proposal, region: target };
      updateLocalProposal(next);
    }).catch((error) => setApiError(error instanceof Error ? error.message : 'No se pudo migrar la región.'));
  }, [proposal, services, updateLocalProposal]);

  const syncCostsFromProposal = useCallback((prop: CloudProposal) => recalculateCosts(prop.selectedServices), [recalculateCosts]);
  const addCostItem = useCallback((_item: Omit<CostSimulationItem, 'id'>) => recalculateCosts(services), [recalculateCosts, services]);
  const removeCostItem = useCallback((_id: string) => recalculateCosts(services), [recalculateCosts, services]);
  const clearCostItems = useCallback(() => recalculateCosts([]), [recalculateCosts]);
  const deleteProposal = useCallback((id: string) => {
    void awsApi.deleteProposal(id).then(() => {
      const remaining = proposals.filter((item) => item.id !== id);
      setProposals(remaining);
      setActiveProposalIdState(remaining[0]?.id || null);
    }).catch((error) => setApiError(error instanceof Error ? error.message : 'No se pudo eliminar la propuesta.'));
  }, [proposals]);
  const setActiveProposalId = useCallback((id: string | null) => setActiveProposalIdState(id), []);
  const resetAll = useCallback(() => {
    setActiveProposalIdState(null);
    setDraftServices([]);
    setCostItems([]);
    setSecurityControls(DEFAULT_SECURITY_CONTROLS);
    setSecurityScore(0);
  }, []);

  return (
    <AwsContext.Provider value={{
      proposal,
      services,
      costItems,
      securityControls,
      serviceCatalog: catalog,
      regions,
      isLoading,
      apiError,
      region,
      selectedRegion: region,
      deployedServices: services,
      totalMonthlyCost,
      totalAnnualCost,
      securityScore,
      slaPercent,
      activeProposal: proposal,
      proposals,
      activeProposalId: proposal?.id || activeProposalId,
      createProposal,
      updateProposal,
      addService,
      removeService,
      replaceServices,
      toggleService,
      addCostItem,
      removeCostItem,
      toggleControl,
      resetAll,
      addProposal: createProposal,
      deleteProposal,
      setActiveProposalId,
      deleteCostItem: removeCostItem,
      clearCostItems,
      setSelectedRegion,
      toggleSecurityControl: toggleControl,
      setAllSecurityControls,
      addServiceToArchitecture: addService,
      removeServiceFromArchitecture: removeService,
      syncCostsFromProposal,
      resetAllToEmpty: resetAll,
      refreshData,
    }}>
      {children}
    </AwsContext.Provider>
  );
};

export function useAws() {
  const context = useContext(AwsContext);
  if (!context) throw new Error('useAws must be used within an AwsProvider');
  return context;
}
