import { useState } from 'react';
import { ArrowLeft, ArrowRight, Mail, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../services/apiClient';

export default function AwsForgotPassword() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await apiFetch<{ message: string }>('/auth/password-recovery/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(response.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const foreground = isDark ? '#f8fafc' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';

  return (
    <main style={{ minHeight: '100vh', background: isDark ? '#0f172a' : 'linear-gradient(135deg,#f8fafc,#eff6ff)', color: foreground, display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'Inter,system-ui,sans-serif' }}>
      <section style={{ width: '100%', maxWidth: 460, background: isDark ? '#111827' : '#fff', border: '1px solid #dbe3ef', borderRadius: 18, padding: 30, boxShadow: '0 20px 45px rgba(15,23,42,.1)' }}>
        <button type="button" onClick={() => navigate('/login')} style={{ border: 0, background: 'transparent', color: '#2563eb', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><ArrowLeft size={14} /> Volver al login</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}><ShieldCheck color="#2563eb" /><div><strong>Recuperar contraseña</strong><div style={{ fontSize: 11, color: muted }}>Cloud Diagnostix AWS</div></div></div>
        <h1 style={{ fontSize: 28, margin: '24px 0 8px' }}>Solicita un enlace</h1>
        <p style={{ color: muted, lineHeight: 1.55, fontSize: 13 }}>Escribe tu correo registrado. Si existe una cuenta, enviaremos un enlace temporal y un código de 6 dígitos para confirmar el cambio.</p>
        <form onSubmit={submit} style={{ display: 'grid', gap: 14, marginTop: 20 }}>
          <label style={{ position: 'relative' }}><Mail size={16} color={muted} style={{ position: 'absolute', left: 13, top: 13 }} /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="usuario@empresa.com" style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 40px', borderRadius: 10, border: '1px solid #cbd5e1', background: isDark ? '#0f172a' : '#f8fafc', color: foreground, fontSize: 14 }} /></label>
          {error && <div style={{ color: '#b91c1c', background: '#fee2e2', padding: 10, borderRadius: 8, fontSize: 13 }}>{error}</div>}
          {message && <div style={{ color: '#166534', background: '#dcfce7', border: '1px solid #bbf7d0', padding: 10, borderRadius: 8, fontSize: 13 }}>{message}</div>}
          <button disabled={loading} type="submit" style={{ padding: 13, border: 0, borderRadius: 10, background: '#2563eb', color: '#fff', fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Enviando…' : 'Enviar enlace de recuperación'} <ArrowRight size={16} /></button>
        </form>
      </section>
    </main>
  );
}
