import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  LayoutDashboard,
  FileText,
  DollarSign,
  Globe,
  ShieldCheck,
  GitBranch,
  CheckCircle2,
  Sparkles,
  Layers,
  Sun,
  Moon,
  KeyRound,
  Crown,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import AwsInteractiveDemo from '../components/AwsInteractiveDemo';

export default function AwsLanding() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const isAuthenticated = Boolean(localStorage.getItem('token'));

  const modules = [
    {
      title: 'Dashboard Ejecutivo',
      description:
        'Monitorea en tiempo real el presupuesto mensual/anual, nivel de disponibilidad SLA, puntaje de seguridad y servicios activos.',
      icon: LayoutDashboard,
      color: '#2563eb',
      bg: isDark ? 'rgba(37, 99, 235, 0.18)' : '#eff6ff',
      path: '/modules/aws/dashboard',
      cta: 'Abrir Dashboard',
    },
    {
      title: 'Planificación & Analizador Cloud',
      description:
        'Importa y analiza tu proyecto automáticamente o registra propuestas comerciales de migración hacia Amazon Web Services.',
      icon: FileText,
      color: '#0ea5e9',
      bg: isDark ? 'rgba(14, 165, 233, 0.18)' : '#f0f9ff',
      path: '/modules/aws/planning',
      cta: 'Planificar Solución',
    },
    {
      title: 'Arquitectura de Red (React Flow + Draw.io)',
      description:
        'Visualiza cómo está estructurado tu proyecto normalmente con React Flow y dibuja tu arquitectura AWS con el editor oficial de Draw.io.',
      icon: Layers,
      color: '#8b5cf6',
      bg: isDark ? 'rgba(139, 92, 246, 0.18)' : '#f5f3ff',
      path: '/modules/aws/network',
      cta: 'Diseñar Arquitectura',
    },
    {
      title: 'Costos y Economía Cloud',
      description:
        'Simula costos por instancia, almacenamiento y transferencia de datos con proyecciones mensuales y anuales detalladas.',
      icon: DollarSign,
      color: '#10b981',
      bg: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5',
      path: '/modules/aws/costs',
      cta: 'Simular Costos',
    },
    {
      title: 'Seguridad e IAM',
      description:
        'Evalúa controles de acceso, MFA, cifrado TLS 1.3/S3 y cumplimiento bajo el Modelo de Responsabilidad Compartida de AWS.',
      icon: ShieldCheck,
      color: '#f59e0b',
      bg: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fffbeb',
      path: '/modules/aws/security',
      cta: 'Evaluar Seguridad',
    },
    {
      title: 'Infraestructura Global & Catálogo AWS',
      description:
        'Explora las regiones globales de AWS, zonas de disponibilidad y el catálogo técnico de servicios de cómputo, red y datos.',
      icon: Globe,
      color: '#6366f1',
      bg: isDark ? 'rgba(99, 102, 241, 0.18)' : '#eef2ff',
      path: '/modules/aws/infrastructure',
      cta: 'Explorar Regiones',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: isDark ? '#090d16' : '#f8fafc',
        color: isDark ? '#f8fafc' : '#0f172a',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        transition: 'background 0.25s ease, color 0.25s ease',
      }}
    >
      {/* Top Navbar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: isDark ? 'rgba(9, 13, 22, 0.94)' : 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          {/* Brand */}
          <div
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(37, 99, 235, 0.16)',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
                Cloud Diagnostix<span style={{ color: '#3b82f6' }}>.</span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '1.2px' }}>
                CLOUD MANAGEMENT SUITE
              </div>
            </div>
          </div>

          {/* Quick Navigation Links + Theme Toggle + Login por correo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Theme Toggle (Modo Claro / Oscuro) */}
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#f8fafc',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 8,
                padding: '8px 13px',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s ease',
              }}
              title="Cambiar entre Modo Oscuro y Modo Claro"
            >
              {isDark ? (
                <>
                  <Sun size={15} color="#fbbf24" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon size={15} color="#93c5fd" />
                  <span>Modo Oscuro</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/modules/aws/network')}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <GitBranch size={15} color="#60a5fa" />
              Arquitectura de Red
            </button>

            <button
              type="button"
              onClick={() => navigate('/login', { state: { mode: 'register' } })}
              style={{
                background: 'rgba(16, 185, 129, 0.16)',
                color: '#6ee7b7',
                border: '1px solid rgba(52, 211, 153, 0.35)',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <KeyRound size={15} />
              {isAuthenticated ? 'Cuenta IAM / código de correo' : 'Empezar Plan Free'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/pricing')}
              style={{
                background: 'rgba(245, 158, 11, 0.14)',
                color: '#fcd34d',
                border: '1px solid rgba(245, 158, 11, 0.34)',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Crown size={15} />
              Planes
            </button>

            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/modules/aws/dashboard' : '/login')}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              }}
            >
              Entrar a la Plataforma
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #090d16 0%, #111827 55%, #0f172a 100%)'
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
          color: '#ffffff',
          padding: '72px 24px 80px',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 48,
            alignItems: 'center',
          }}
        >
          {/* Left Column: Value Proposition */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                alignSelf: 'flex-start',
                background: 'rgba(37, 99, 235, 0.18)',
                border: '1px solid rgba(96, 165, 250, 0.35)',
                color: '#93c5fd',
                borderRadius: 999,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <Sparkles size={14} />
              Diagnóstico, Planeación y Arquitectura AWS
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(2rem, 3.8vw, 3.1rem)',
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: '-0.8px',
                color: '#ffffff',
              }}
            >
              Diseña, diagnostica y visualiza tu arquitectura cloud con{' '}
              <span style={{ color: '#60a5fa' }}>Cloud Diagnostix.</span>
            </h1>

            <p
              style={{
                margin: 0,
                fontSize: 16,
                lineHeight: 1.65,
                color: '#cbd5e1',
                maxWidth: 600,
              }}
            >
              Centraliza la planeación de propuestas en Amazon Web Services, estima presupuestos FinOps, audita la
              seguridad IAM y modela tu infraestructura combinando <strong>React Flow</strong> (para ver cómo está tu
              proyecto normalmente) y <strong>Draw.io</strong> (para dibujar tu arquitectura en AWS).
            </p>

            {/* Primary CTA Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => navigate('/modules/aws/dashboard')}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '13px 24px',
                  fontSize: 14.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.38)',
                }}
              >
                Ir al Dashboard
                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                onClick={() => navigate('/modules/aws/planning')}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: 10,
                  padding: '13px 22px',
                  fontSize: 14.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <FileText size={16} color="#93c5fd" />
                Planificar Proyecto
              </button>

            </div>

            {/* Key highlights */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 18,
                marginTop: 8,
                paddingTop: 18,
                borderTop: '1px solid rgba(255,255,255,0.1)',
                fontSize: 13,
                color: '#94a3b8',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={15} color="#34d399" /> Vista del proyecto en React Flow
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={15} color="#34d399" /> Diagramación AWS en Draw.io
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={15} color="#34d399" /> Login IAM con código por correo & FinOps
              </span>
            </div>
          </div>

          {/* Right Column: Interactive example lab */}
          <AwsInteractiveDemo isDark={isDark} />
        </div>
      </section>

      {/* Modules Grid Section */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '64px 24px', flex: 1 }}>
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 44px' }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#3b82f6',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Módulos de la Suite
          </span>
          <h2
            style={{
              margin: '8px 0 10px',
              fontSize: 28,
              fontWeight: 800,
              color: isDark ? '#f8fafc' : '#0f172a',
            }}
          >
            Todo lo que necesitas para diagnosticar y diseñar en AWS
          </h2>
          <p style={{ margin: 0, fontSize: 14.5, color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.6 }}>
            Selecciona cualquier módulo para comenzar a trabajar directamente en tu diagnóstico o arquitectura cloud.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
          }}
        >
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.title}
                onClick={() => navigate(mod.path)}
                style={{
                  background: isDark ? '#111827' : '#ffffff',
                  border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: 24,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16,
                  boxShadow: isDark
                    ? '0 4px 18px rgba(0, 0, 0, 0.35)'
                    : '0 2px 10px rgba(15, 23, 42, 0.03)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = isDark
                    ? '0 14px 28px rgba(0, 0, 0, 0.5)'
                    : '0 12px 24px rgba(15, 23, 42, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isDark
                    ? '0 4px 18px rgba(0, 0, 0, 0.35)'
                    : '0 2px 10px rgba(15, 23, 42, 0.03)';
                }}
              >
                <div>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      background: mod.bg,
                      color: mod.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <Icon size={22} />
                  </div>
                  <h3
                    style={{
                      margin: '0 0 8px',
                      fontSize: 17,
                      fontWeight: 800,
                      color: isDark ? '#f8fafc' : '#0f172a',
                    }}
                  >
                    {mod.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 13.5, color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.55 }}>
                    {mod.description}
                  </p>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    color: mod.color,
                  }}
                >
                  {mod.cta}
                  <ArrowRight size={15} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: '#0f172a',
          color: '#94a3b8',
          borderTop: '1px solid #1e293b',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: 12.5,
          }}
        >
          <div>
            <strong style={{ color: '#f8fafc' }}>Cloud Diagnostix.</strong> • Plataforma de Diagnóstico y Arquitectura
            AWS
          </div>
          <div>V1.0.0 • React Flow + Draw.io AWS Suite</div>
        </div>
      </footer>
    </div>
  );
}
