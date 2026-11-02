import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  AlertCircle,
  Check,
  X,
  Sparkles,
  Inbox,
} from 'lucide-react';
import './NotificationBell.css';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: 'success' | 'warning' | 'info' | 'error';
  category: string;
}

const mockNotificationsByModule: Record<string, NotificationItem[]> = {
  admin: [
    {
      id: 'adm-1',
      title: 'Nuevo Usuario Registrado',
      description: 'Juan Pérez se ha registrado exitosamente con rol Analista.',
      time: 'Hace 8 min',
      unread: true,
      type: 'info',
      category: 'Usuarios',
    },
    {
      id: 'adm-2',
      title: 'Reporte Mensual Generado',
      description: 'El consolidado de auditoría y métricas Q3 está disponible para exportación.',
      time: 'Hace 35 min',
      unread: true,
      type: 'success',
      category: 'Reportes',
    },
    {
      id: 'adm-3',
      title: 'Alerta de Rendimiento',
      description: 'Uso de CPU en el servidor principal superó el umbral del 80%.',
      time: 'Hace 2 horas',
      unread: true,
      type: 'warning',
      category: 'Sistema',
    },
    {
      id: 'adm-4',
      title: 'Licencias Actualizadas',
      description: 'Se habilitaron 25 nuevos cupos para el módulo Big Data Lab.',
      time: 'Hace 1 día',
      unread: false,
      type: 'info',
      category: 'Licencias',
    },
    {
      id: 'adm-5',
      title: 'Backup Global Completado',
      description: 'Copia de seguridad cifrada guardada en almacenamiento seguro (4.2 GB).',
      time: 'Hace 2 días',
      unread: false,
      type: 'success',
      category: 'Seguridad',
    },
  ],
  'big-data': [
    {
      id: 'bd-1',
      title: 'Pipeline ETL Completado',
      description: 'Carga masiva "ventas_retail_q3.parquet" procesó 1.450.000 registros sin errores.',
      time: 'Hace 5 min',
      unread: true,
      type: 'success',
      category: 'ETL Pipeline',
    },
    {
      id: 'bd-2',
      title: 'Desviación Estadística Detectada',
      description: 'Se detectó una variación atípica de +28% en transacciones en la Región Norte.',
      time: 'Hace 22 min',
      unread: true,
      type: 'warning',
      category: 'Análisis',
    },
    {
      id: 'bd-3',
      title: 'Nuevo Dataset Publicado',
      description: 'Dataset "segmentacion_clientes_2024.csv" listo en el Workspace.',
      time: 'Hace 1 hora',
      unread: true,
      type: 'info',
      category: 'Datasets',
    },
    {
      id: 'bd-4',
      title: 'Cluster Spark Escalado',
      description: 'Escalado dinámico a 6 nodos workers activado por demanda de cómputo.',
      time: 'Hace 4 horas',
      unread: false,
      type: 'info',
      category: 'Infraestructura',
    },
    {
      id: 'bd-5',
      title: 'Informe Predictivo Exportado',
      description: 'El modelo de retención de clientes generó las proyecciones en PDF.',
      time: 'Hace 1 día',
      unread: false,
      type: 'success',
      category: 'Informes',
    },
  ],
  azure: [
    {
      id: 'az-1',
      title: 'Blob Storage Sincronizado',
      description: 'Contenedor "raw-telemetry-lake" recibió 850 MB de nuevos datos IoT.',
      time: 'Hace 12 min',
      unread: true,
      type: 'success',
      category: 'Storage',
    },
    {
      id: 'az-2',
      title: 'Alerta de Cómputo VM',
      description: 'Instancia "azure-vm-spark-worker-01" alcanzó el 82% de memoria RAM.',
      time: 'Hace 40 min',
      unread: true,
      type: 'warning',
      category: 'Virtual Machines',
    },
    {
      id: 'az-3',
      title: 'Data Factory Pipeline Éxito',
      description: 'Pipeline "Ingest_SQL_to_ADLS_Gen2" finalizó en 14m 20s.',
      time: 'Hace 2 horas',
      unread: true,
      type: 'info',
      category: 'Data Factory',
    },
    {
      id: 'az-4',
      title: 'Azure Key Vault Actualizado',
      description: 'Certificado SSL y credenciales rotadas correctamente.',
      time: 'Hace 1 día',
      unread: false,
      type: 'success',
      category: 'Seguridad',
    },
    {
      id: 'az-5',
      title: 'Control de Presupuesto',
      description: 'El consumo actual representa el 62% del presupuesto asignado para el mes.',
      time: 'Hace 2 días',
      unread: false,
      type: 'info',
      category: 'Costos',
    },
  ],
  aws: [
    {
      id: 'aws-1',
      title: 'Instancia EC2 Desplegada',
      description: 'La instancia "erp-prod-node-01" está operativa en us-east-1a.',
      time: 'Hace 5 min',
      unread: true,
      type: 'success',
      category: 'Compute',
    },
    {
      id: 'aws-2',
      title: 'Bucket S3 Sincronizado',
      description: 'Carga de datasets crudos completada en "erp-analytics-raw-datasets".',
      time: 'Hace 25 min',
      unread: true,
      type: 'info',
      category: 'Storage',
    },
    {
      id: 'aws-3',
      title: 'AWS Lambda Concurrencia',
      description: 'Pico de 142 ejecuciones concurrentes procesado sin errores.',
      time: 'Hace 1 hora',
      unread: false,
      type: 'success',
      category: 'Serverless',
    },
  ],
};

interface NotificationBellProps {
  module?: 'admin' | 'big-data' | 'azure' | 'aws';
  className?: string;
}

export default function NotificationBell({ module: explicitModule, className = '' }: NotificationBellProps) {
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Determine current module
  const currentModule = explicitModule || (() => {
    const path = location.pathname;
    if (path.startsWith('/modules/aws') || path.startsWith('/admin/aws')) return 'aws';
    if (path.startsWith('/modules/azure') || path.startsWith('/admin/azure')) return 'azure';
    if (path.startsWith('/modules/big-data') || path.startsWith('/analyst')) return 'big-data';
    return 'admin';
  })();

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    return mockNotificationsByModule[currentModule] || mockNotificationsByModule.admin;
  });

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Sync module changes
  useEffect(() => {
    setNotifications(mockNotificationsByModule[currentModule] || mockNotificationsByModule.admin);
  }, [currentModule]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const toggleItemRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
    );
  };

  const dismissNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'unread') return item.unread;
    return true;
  });

  const getModuleLabel = () => {
    switch (currentModule) {
      case 'big-data':
        return 'Big Data Lab';
      case 'azure':
        return 'Microsoft Azure';
      default:
        return 'Admin Portal';
    }
  };

  const renderIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} />;
      case 'warning':
        return <AlertTriangle size={16} />;
      case 'error':
        return <AlertCircle size={16} />;
      default:
        return <Info size={16} />;
    }
  };

  return (
    <div className={`notification-wrapper ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        className={`notification-trigger-btn topbar-icon-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notificaciones del sistema"
        title="Ver notificaciones"
        aria-expanded={isOpen}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="notification-badge" aria-label={`${unreadCount} no leídas`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div ref={dropdownRef} className="notification-dropdown" role="region" aria-label="Centro de notificaciones">
          {/* Header */}
          <div className="notification-header">
            <div className="notification-header-title">
              <span>Notificaciones</span>
              {unreadCount > 0 && (
                <span className="notification-header-count">{unreadCount} nuevas</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all-btn"
                onClick={markAllAsRead}
                title="Marcar todas como leídas"
              >
                <Check size={13} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                Marcar leídas
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="notification-filter-tabs">
            <button
              type="button"
              className={`notification-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Todas ({notifications.length})
            </button>
            <button
              type="button"
              className={`notification-filter-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              No leídas ({unreadCount})
            </button>
          </div>

          {/* List */}
          <div className="notification-list">
            {filteredNotifications.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-empty-icon">
                  <Inbox size={22} />
                </div>
                <p className="notification-empty-text">
                  {filter === 'unread'
                    ? '¡Todo al día! No tienes notificaciones pendientes.'
                    : 'No hay notificaciones en este módulo.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  className={`notification-item ${item.unread ? 'unread' : ''}`}
                  onClick={() => toggleItemRead(item.id)}
                  title="Haz clic para marcar como leída/no leída"
                >
                  <div className={`notification-icon-box ${item.type}`}>
                    {renderIcon(item.type)}
                  </div>

                  <div className="notification-content">
                    <div className="notification-item-header">
                      <span className="notification-category">{item.category}</span>
                      <span className="notification-time">{item.time}</span>
                    </div>
                    <h4 className="notification-item-title">{item.title}</h4>
                    <p className="notification-item-desc">{item.description}</p>
                  </div>

                  {item.unread && <span className="notification-unread-dot" />}

                  <button
                    type="button"
                    className="notification-dismiss-btn"
                    onClick={(e) => dismissNotification(e, item.id)}
                    title="Descartar notificación"
                    aria-label="Descartar notificación"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="notification-footer">
            <span className="notification-module-tag">
              <Sparkles size={12} style={{ color: '#2563eb' }} />
              {getModuleLabel()}
            </span>
            {notifications.length > 0 && (
              <button
                type="button"
                className="notification-clear-all-btn"
                onClick={clearAll}
                title="Limpiar lista"
              >
                Limpiar todo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
