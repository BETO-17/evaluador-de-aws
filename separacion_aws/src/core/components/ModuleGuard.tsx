import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ModuleGuardProps {
  moduleKey: 'bigData' | 'microsoftAzure' | 'aws';
  children: ReactNode;
}

export default function ModuleGuard({ moduleKey, children }: ModuleGuardProps) {
  // Obtener permisos por módulo del localStorage
  const savedPermissions = localStorage.getItem('course_access_permissions');
  const permissions = savedPermissions
    ? JSON.parse(savedPermissions)
    : { bigData: 'approved', microsoftAzure: 'locked', aws: 'approved' };

  const status = permissions[moduleKey];

  if (status !== 'approved') {
    // Si no está aprobado por el admin, redirigir al portal de cursos con el parámetro del módulo bloqueado
    return <Navigate to={`/portal-cursos?blocked=${moduleKey}`} replace />;
  }

  return <>{children}</>;
}
