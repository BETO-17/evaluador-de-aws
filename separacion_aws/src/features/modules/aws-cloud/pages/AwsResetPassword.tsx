import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../services/apiClient';

export default function AwsResetPassword() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [emailHint, setEmailHint] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setError('El enlace de recuperación no contiene un token.');
      return;
    }
    void apiFetch<{ valid: boolean; email_hint?: string; message: string }>(`/auth/password-recovery/validate?token=${encodeURIComponent(token)}`)
      .then((response) => {
        setValid(response.valid);
        setEmailHint(response.email_hint || '');
        if (!response.valid) setError(response.message);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'No se pudo validar el enlace.'))
      .finally(() => setValidating(false));
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirmPassword) return setError('Las contraseñas nuevas no coinciden.');
    if (emailCode.length !== 6) return setError('Ingresa el código de 6 dígitos enviado a tu correo.');
    setLoading(true);
    try {
      const response = await apiFetch<{ message: string }>('/auth/password-recovery/confirm', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: password, confirm_password: confirmPassword, email_code: emailCode }),
      });
      setMessage(response.message);
      window.setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const foreground = isDark ? '#f8fafc' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const inputStyle = { width: '100%', boxSizing: 'border-box' as const, padding: '12px 14px 12px 40px', borderRadius: 10, border: '1px solid #cbd5e1', background: isDark ? '#0f172a' : '#f8fafc', color: foreground, fontSize: 14 };

  return (
    <main style={{ minHeight: '100vh', background: isDark ? '#0f172a' : 'linear-gradient(135deg,#f8fafc,#eff6ff)', color: foreground, display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'Inter,system-ui,sans-serif' }}>
      <section style={{ width: '100%', maxWidth: 460, background: isDark ? '#111827' : '#fff', border: '1px solid #dbe3ef', borderRadius: 18, padding: 30, boxShadow: '0 20px 45px rgba(15,23,42,.1)' }}>
        <button type="button" onClick={() => navigate('/login')} style={{ border: 0, background: 'transparent', color: '#2563eb', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><ArrowLeft size={14} /> Volver al login</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}><ShieldCheck color="#2563eb" /><div><strong>Cambiar contraseña</strong><div style={{ fontSize: 11, color: muted }}>{emailHint || 'Cloud Diagnostix AWS'}</div></div></div>
        <h1 style={{ fontSize: 28, margin: '24px 0 8px' }}>Nueva contraseña</h1>
        {validating && <p style={{ color: muted }}>Validando enlace…</p>}
        {!validating && !valid && <><p style={{ color: '#b91c1c', background: '#fee2e2', padding: 10, borderRadius: 8, fontSize: 13 }}>{error || 'El enlace no es válido.'}</p><button type="button" onClick={() => navigate('/login/forgot-password')} style={{ border: 0, background: '#2563eb', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer' }}>Solicitar otro enlace</button></>}
        {!validating && valid && <form onSubmit={submit} style={{ display: 'grid', gap: 14, marginTop: 20 }}>
          <label style={{ position: 'relative' }}><KeyRound size={16} color={muted} style={{ position: 'absolute', left: 13, top: 13 }} /><input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nueva contraseña" style={inputStyle} /></label>
          <label style={{ position: 'relative' }}><KeyRound size={16} color={muted} style={{ position: 'absolute', left: 13, top: 13 }} /><input required minLength={8} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirmar contraseña" style={inputStyle} /></label>
          <label><input required inputMode="numeric" maxLength={6} value={emailCode} onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Código de correo de 6 dígitos" style={{ ...inputStyle, paddingLeft: 14, letterSpacing: 4 }} /></label>
          {error && <div style={{ color: '#b91c1c', background: '#fee2e2', padding: 10, borderRadius: 8, fontSize: 13 }}>{error}</div>}
          {message && <div style={{ color: '#166534', background: '#dcfce7', padding: 10, borderRadius: 8, fontSize: 13 }}>{message}</div>}
          <button disabled={loading} type="submit" style={{ padding: 13, border: 0, borderRadius: 10, background: '#2563eb', color: '#fff', fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Guardando…' : 'Cambiar contraseña'} <ArrowRight size={16} /></button>
        </form>}
      </section>
    </main>
  );
}
