import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { AwsProvider, useAws } from '../context/AwsContext';
import AwsAiRegionAdvisor from '../components/AwsAiRegionAdvisor';
import AwsSidebar from './AwsSidebar';
import AwsHeader from './AwsHeader';
import './AwsLayout.css';
import '../aws.css';

interface AwsLayoutProps {
  topBar?: React.ReactNode;
  onLogout?: () => void;
}

function AwsLayoutContent({ onLogout }: AwsLayoutProps) {
  const location = useLocation();
  const { resetAll } = useAws();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const path = location.pathname;
  let activeView = 'dashboard';
  if (path.includes('/planning')) activeView = 'planning';
  if (path.includes('/costs')) activeView = 'costs';
  if (path.includes('/infrastructure')) activeView = 'infrastructure';
  if (path.includes('/security')) activeView = 'security';
  if (path.includes('/network')) activeView = 'network';
  if (path.includes('/services')) activeView = 'services';

  return (
    <div className="admin-layout aws-theme-layout aws-scope">
      {/* Extracted Modular Sidebar */}
      <AwsSidebar
        activeView={activeView}
        onResetClick={() => setShowResetConfirm(true)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Content Area */}
      <div
        className="admin-content"
        style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
      >
        {/* Extracted Modular Header */}
        <AwsHeader
          activeView={activeView}
          isAiAdvisorOpen={isAiAdvisorOpen}
          setIsAiAdvisorOpen={setIsAiAdvisorOpen}
          onLogout={onLogout}
          onToast={showToast}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Content View + AI Drawer Container */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          <main
            className="admin-main"
            style={{
              flex: 1,
              minWidth: 0,
              overflowY: 'auto',
              padding: '24px 32px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <Outlet />
          </main>

          {/* Right Lateral AI Cloud Architect Panel */}
          <AwsAiRegionAdvisor
            isOpen={isAiAdvisorOpen}
            onClose={() => setIsAiAdvisorOpen(false)}
          />
        </div>
      </div>

      {/* Reset Confirm Modal */}
      {showResetConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 420,
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: '#1e293b' }}>
              ¿Reiniciar entorno a cero?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Se vaciarán todas las propuestas registradas, ítems en la calculadora de costos y configuraciones de seguridad para comenzar desde cero.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAll();
                  setShowResetConfirm(false);
                  showToast('Entorno reiniciado a cero');
                }}
                style={{
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Sí, Reiniciar a Cero
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0f172a',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 600,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid #334155',
            animation: 'dropdownFadeIn 0.2s ease-out',
          }}
        >
          <Sparkles size={14} color="#2563eb" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default function AwsLayout({ topBar, onLogout }: AwsLayoutProps) {
  return (
    <AwsProvider>
      <AwsLayoutContent topBar={topBar} onLogout={onLogout} />
    </AwsProvider>
  );
}
