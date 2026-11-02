/**
 * Modal de captura de correo para activar los 2 intentos Freemium.
 * Registra el correo con POST /subscriptions/register-trial.
 */

import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Mail, ShieldCheck, X } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';

export default function AwsEmailTrialGateModal() {
  const { isEmailGateOpen, closeEmailGate, registerTrialEmail } = useSubscription();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isEmailGateOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = value.trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Ingresa un correo válido para continuar.');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await registerTrialEmail(email);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="subscription-overlay" role="presentation" onMouseDown={closeEmailGate}>
      <section
        className="subscription-email-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-trial-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="subscription-modal-close" onClick={closeEmailGate} aria-label="Cerrar">
          <X size={18} />
        </button>
        <div className="subscription-modal-icon subscription-modal-icon-blue"><Mail size={22} /></div>
        <span className="subscription-eyebrow">PRUEBA GRATUITA</span>
        <h2 id="email-trial-title">Activa tus 2 auditorías gratuitas</h2>
        <p className="subscription-modal-copy">
          Vinculamos tus intentos a tu correo para que puedas volver a Cloud Diagnostix sin perder tu progreso.
        </p>

        <div className="subscription-trust-row">
          <span><Check size={14} /> Sin tarjeta</span>
          <span><ShieldCheck size={14} /> Datos protegidos</span>
        </div>

        <form onSubmit={handleSubmit} className="subscription-email-form">
          <label htmlFor="trial-email">Correo profesional</label>
          <div className="subscription-input-wrap">
            <Mail size={16} />
            <input
              id="trial-email"
              type="email"
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="tu@empresa.com"
              autoComplete="email"
            />
          </div>
          {error && <p className="subscription-form-error">{error}</p>}
          <button type="submit" className="subscription-primary-btn" disabled={isSaving}>
            {isSaving ? 'Activando prueba…' : 'Comenzar prueba'}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="subscription-legal">Al continuar aceptas recibir información operativa de tu cuenta.</p>
      </section>
    </div>
  );
}
