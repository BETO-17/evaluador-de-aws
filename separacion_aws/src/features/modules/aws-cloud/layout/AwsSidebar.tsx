import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, DollarSign, Globe, ShieldCheck, Layers, Cpu, Trash2, ArrowLeft, X } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const AWS_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/modules/aws/dashboard', icon: LayoutDashboard },
  { id: 'planning', label: 'Planificación Cloud', path: '/modules/aws/planning', icon: FileText },
  { id: 'costs', label: 'Costos y Economía Cloud', path: '/modules/aws/costs', icon: DollarSign },
  { id: 'infrastructure', label: 'Infraestructura Global', path: '/modules/aws/infrastructure', icon: Globe },
  { id: 'security', label: 'Seguridad e IAM', path: '/modules/aws/security', icon: ShieldCheck },
  { id: 'network', label: 'Arquitectura de Red', path: '/modules/aws/network', icon: Layers },
  { id: 'services', label: 'Catálogo de Servicios AWS', path: '/modules/aws/services', icon: Cpu },
];

interface AwsSidebarProps {
  activeView: string;
  onResetClick: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function AwsSidebar({ activeView, onResetClick, isMobileOpen = false, onCloseMobile }: AwsSidebarProps) {
  const navigate = useNavigate();
  const handleNavClick = (path: string) => {
    navigate(path);
    onCloseMobile?.();
  };

  return (
    <>
      {isMobileOpen && <div className="aws-mobile-backdrop" onClick={onCloseMobile} aria-hidden="true" />}
      <aside className={`admin-sidebar aws-sidebar ${isMobileOpen ? 'mobile-open' : ''}`} aria-label="Sidebar de navegación AWS">
        <div className="sidebar-header cloudops-sidebar-header">
          <div className="cloudops-brand" onClick={() => handleNavClick('/modules/aws/dashboard')} title="Cloud Diagnostix">
            <div className="cloudops-icon-container">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              </svg>
            </div>
            <div className="cloudops-text-group">
              <div className="cloudops-title">Cloud Diagnostix<span className="cloudops-dot">.</span></div>
              <div className="cloudops-subtitle">CLOUD MANAGEMENT</div>
            </div>
          </div>
          {onCloseMobile && <button type="button" className="aws-sidebar-close-btn" onClick={onCloseMobile} title="Cerrar menú" aria-label="Cerrar menú"><X size={20} color="#94a3b8" /></button>}
        </div>

        <nav className="sidebar-nav" aria-label="Navegación principal AWS">
          {AWS_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return <button key={item.id} type="button" className={`sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={() => handleNavClick(item.path)} aria-current={isActive ? 'page' : undefined}><Icon size={18} /><span>{item.label}</span></button>;
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-state-controls">
            <button type="button" className="sidebar-action-btn btn-reset" onClick={() => { onResetClick(); onCloseMobile?.(); }} title="Limpiar la vista activa"><Trash2 size={14} /><span>Limpiar Vista</span></button>
          </div>
          <button type="button" className="sidebar-footer-btn" style={{ marginTop: 2 }} onClick={() => handleNavClick('/')}><ArrowLeft size={16} />Volver al Inicio</button>
          <div className="sidebar-version">V1.0.0 · Cloud Diagnostix AWS Suite</div>
        </div>
      </aside>
    </>
  );
}
