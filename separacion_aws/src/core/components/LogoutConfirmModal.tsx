import { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';
import './LogoutConfirmModal.css';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export default function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Deseas cerrar sesión?',
  message = 'Tu sesión actual se cerrará de forma segura y regresarás a la pantalla principal. ¿Estás seguro de continuar?',
}: LogoutConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="logout-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div className="logout-modal-card">
        {/* Close icon button */}
        <button
          className="logout-modal-close-btn"
          onClick={onClose}
          aria-label="Cerrar modal"
          type="button"
        >
          <X size={16} />
        </button>

        {/* Warning Icon Badge */}
        <div className="logout-modal-icon-wrapper">
          <div className="logout-modal-icon-bg">
            <LogOut size={26} className="logout-modal-icon" />
          </div>
        </div>

        {/* Content */}
        <div className="logout-modal-content">
          <h2 id="logout-modal-title" className="logout-modal-title">
            {title}
          </h2>
          <p className="logout-modal-desc">{message}</p>
        </div>

        {/* Action Buttons */}
        <div className="logout-modal-actions">
          <button
            type="button"
            className="logout-modal-btn logout-modal-btn-cancel"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="logout-modal-btn logout-modal-btn-confirm"
            onClick={onConfirm}
          >
            <LogOut size={16} />
            <span>Sí, Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
}
