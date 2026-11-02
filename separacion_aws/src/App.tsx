import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ProtectedRoute from './core/components/ProtectedRoute';
import ModuleGuard from './core/components/ModuleGuard';
import LogoutConfirmModal from './core/components/LogoutConfirmModal';

// Cloud Diagnostix — Theme, Landing Page, Login TOTP y Módulos AWS
import { ThemeProvider } from './features/modules/aws-cloud/context/ThemeContext';
import AwsLanding from './features/modules/aws-cloud/pages/AwsLanding';
import AwsLogin from './features/modules/aws-cloud/pages/AwsLogin';
import AwsForgotPassword from './features/modules/aws-cloud/pages/AwsForgotPassword';
import AwsResetPassword from './features/modules/aws-cloud/pages/AwsResetPassword';
import AwsLayout from './features/modules/aws-cloud/layout/AwsLayout';
import AwsDashboard from './features/modules/aws-cloud/pages/AwsDashboard';
import AwsPlanning from './features/modules/aws-cloud/pages/AwsPlanning';
import AwsCosts from './features/modules/aws-cloud/pages/AwsCosts';
import AwsInfrastructure from './features/modules/aws-cloud/pages/AwsInfrastructure';
import AwsSecurity from './features/modules/aws-cloud/pages/AwsSecurity';
import AwsNetwork from './features/modules/aws-cloud/pages/AwsNetwork';
import AwsServicesCatalog from './features/modules/aws-cloud/pages/AwsServicesCatalog';
import AwsPricing from './features/modules/aws-cloud/pages/AwsPricing';
import { SubscriptionProvider } from './features/modules/aws-cloud/context/SubscriptionContext';
import AwsEmailTrialGateModal from './features/modules/aws-cloud/components/AwsEmailTrialGateModal';
import AwsSubscriptionPaywallModal from './features/modules/aws-cloud/components/AwsSubscriptionPaywallModal';

// Stylesheets base y del módulo AWS
import './styles/AdminLayout.css';
import './styles/admin.css';
import './features/modules/aws-cloud/aws.css';
import './features/modules/aws-cloud/components/subscription.css';

function App() {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <ThemeProvider>
      <SubscriptionProvider>
        <Routes>
        {/* Entrada Principal del Proyecto: Landing Page de Cloud Diagnostix */}
        <Route path="/" element={<AwsLanding />} />
        <Route path="/login" element={<AwsLogin />} />
        <Route path="/login/forgot-password" element={<AwsForgotPassword />} />
        <Route path="/login/reset-password" element={<AwsResetPassword />} />
        <Route path="/pricing" element={<AwsPricing />} />
        <Route path="/portal-cursos" element={<Navigate to="/" replace />} />

        {/* Módulo Dedicado: Cloud Diagnostix AWS Suite */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/modules/aws/*"
            element={
              <ModuleGuard moduleKey="aws">
                <AwsLayout onLogout={handleLogoutClick} />
              </ModuleGuard>
            }
          >
            <Route path="dashboard" element={<AwsDashboard />} />
            <Route path="planning" element={<AwsPlanning />} />
            <Route path="costs" element={<AwsCosts />} />
            <Route path="infrastructure" element={<AwsInfrastructure />} />
            <Route path="security" element={<AwsSecurity />} />
            <Route path="network" element={<AwsNetwork />} />
            <Route path="services" element={<AwsServicesCatalog />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        {/* Fallback general hacia el Landing Page */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <AwsEmailTrialGateModal />
        <AwsSubscriptionPaywallModal />

      {/* Modal de confirmación de cierre de sesión */}
        <LogoutConfirmModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleConfirmLogout}
        />
      </SubscriptionProvider>
    </ThemeProvider>
  );
}

export default App;
