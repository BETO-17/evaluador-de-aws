export type RegionOperationalStatus = 'En uso' | 'Requiere revisión' | 'Disponible';

export interface RegionStatusDetails {
  status: RegionOperationalStatus;
  color: string;
  bg: string;
  border: string;
  dot: string;
}

/** Estado visual derivado de la propuesta activa; el catálogo viene de GET /regions. */
export function getRegionStatus(regionCode: string, proposedRegionStr?: string | null, services: string[] = []): RegionStatusDetails {
  const isTarget = Boolean(proposedRegionStr?.includes(regionCode));
  if (isTarget && services.length > 0) return { status: 'En uso', color: '#15803D', bg: '#DCFCE7', border: '#86EFAC', dot: '#16A34A' };
  if (isTarget) return { status: 'Requiere revisión', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', dot: '#F59E0B' };
  return { status: 'Disponible', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6' };
}
