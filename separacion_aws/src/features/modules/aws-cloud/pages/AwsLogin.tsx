import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Mail, Moon, ShieldCheck, Sun, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { apiFetch } from '../services/apiClient';

interface AuthUser {
  id?: string;
  email: string;
  full_name: string;
  role: string;
  intentos_usados?: number;
  plan_actual?: string;
}

export default function AwsLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { registerTrialEmail } = useSubscription();
  const loginState = location.state as { from?: string; mode?: 'login' | 'register' } | null;
  const redirectTo = loginState?.from || '/modules/aws/dashboard';

  const [mode, setMode] = useState<'login' | 'register'>(loginState?.mode === 'register' ? 'register' : 'login');
  const [step, setStep] = useState<'credentials' | 'email-code'>('credentials');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('AWS Solutions Architect');
  const [showPassword, setShowPassword] = useState(false);
  const [preAuthToken, setPreAuthToken] = useState('');
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  const getInitials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CD';

  const handleCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!email.includes('@')) return setError('Ingresa un correo electrónico válido.');
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (mode === 'register' && fullName.trim().length < 2) return setError('Ingresa tu nombre completo.');

    setLoading(true);
    try {
      const data = mode === 'register'
        ? await apiFetch<{ pre_auth_token: string; user: AuthUser }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, full_name: fullName, role }) })
        : await apiFetch<{ pre_auth_token: string; user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setEmail(data.user.email);
      setFullName(data.user.full_name);
      setRole(data.user.role);
      setPreAuthToken(data.pre_auth_token);
      setCodeDigits(['', '', '', '', '', '']);
      setStep('email-code');
      window.setTimeout(() => codeRefs.current[0]?.focus(), 80);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo conectar con el backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(-1);
    const next = [...codeDigits];
    next[index] = clean;
    setCodeDigits(next);
    if (clean && index < 5) codeRefs.current[index + 1]?.focus();
  };

  const handleVerifyEmailCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = codeDigits.join('');
    if (code.length !== 6) return setError('Ingresa los 6 dígitos del código enviado a tu correo.');
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ access_token: string; user: AuthUser }>('/auth/verify-email-code', { method: 'POST', body: JSON.stringify({ email_code: code, pre_auth_token: preAuthToken }) });
      const user = { ...data.user, role_title: data.user.role, username: data.user.email.split('@')[0], initials: getInitials(data.user.full_name), mfa_verified: true, login_at: new Date().toISOString() };
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(user));
      await registerTrialEmail(data.user.email);
      navigate(redirectTo, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'El código de correo no es válido.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const, padding: '12px 14px 12px 40px', borderRadius: 10, border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a', fontSize: 14 };
  const foreground = isDark ? '#f8fafc' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';

  return (
    <main style={{ minHeight: '100vh', background: isDark ? '#0f172a' : 'linear-gradient(135deg,#f8fafc,#eff6ff)', color: foreground, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 28px', borderBottom: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><ShieldCheck color="#2563eb" /><div><strong>Cloud Diagnostix<span style={{ color: '#2563eb' }}>.</span></strong><div style={{ fontSize: 10, color: muted, letterSpacing: 1 }}>AWS IAM · EMAIL CODE ACCESS PORTAL</div></div></div>
        <div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={toggleTheme} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'transparent', color: foreground }}>{isDark ? <Sun size={15} /> : <Moon size={15} />}</button><button type="button" onClick={() => navigate('/')} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'transparent', color: foreground }}><ArrowLeft size={14} /> Volver</button></div>
      </header>

      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '70px 24px', display: 'grid', gridTemplateColumns: '1fr minmax(340px, 460px)', gap: 60, alignItems: 'center' }}>
        <div><span style={{ display: 'inline-flex', gap: 7, color: '#2563eb', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: 999, fontWeight: 700, fontSize: 12 }}><ShieldCheck size={15} /> Plan Free · 2 auditorías gratis por correo</span><h1 style={{ fontSize: 'clamp(2rem,5vw,3.6rem)', lineHeight: 1.08, margin: '24px 0 18px' }}>Acceso seguro a la suite <span style={{ color: '#3b82f6' }}>Cloud Diagnostix AWS</span></h1><p style={{ color: muted, lineHeight: 1.7 }}>El backend valida tus credenciales y envía un código de verificación de 6 dígitos a tu correo. El Plan Free comienza con 2 auditorías y luego puedes actualizar a Premium.</p></div>

        <div style={{ background: isDark ? '#111827' : '#ffffff', border: '1px solid #dbe3ef', borderRadius: 18, padding: 28, boxShadow: '0 20px 45px rgba(15,23,42,.1)' }}>
          {step === 'credentials' ? <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: isDark ? '#1e293b' : '#f1f5f9', padding: 5, borderRadius: 10, marginBottom: 22 }}><button type="button" onClick={() => setMode('login')} style={{ padding: 9, border: 0, borderRadius: 7, background: mode === 'login' ? '#2563eb' : 'transparent', color: mode === 'login' ? '#fff' : muted }}>Iniciar sesión</button><button type="button" onClick={() => setMode('register')} style={{ padding: 9, border: 0, borderRadius: 7, background: mode === 'register' ? '#2563eb' : 'transparent', color: mode === 'register' ? '#fff' : muted }}>Crear cuenta Free</button></div>
            <h2>{mode === 'register' ? 'Activa tu cuenta Free' : 'Bienvenido de nuevo'}</h2><p style={{ color: muted, fontSize: 13 }}>Te enviaremos un código de verificación de 6 dígitos por correo para confirmar tu acceso.</p>
            <form onSubmit={handleCredentials} style={{ display: 'grid', gap: 14 }}>
              {mode === 'register' && <label style={{ position: 'relative' }}><User size={16} style={{ position: 'absolute', left: 13, top: 13 }} /><input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombre completo" /></label>}
              <label style={{ position: 'relative' }}><Mail size={16} style={{ position: 'absolute', left: 13, top: 13 }} /><input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@empresa.com" /></label>
              <label style={{ position: 'relative' }}><KeyRound size={16} style={{ position: 'absolute', left: 13, top: 13 }} /><input style={inputStyle} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mínimo 8 caracteres)" /><button type="button" onClick={() => setShowPassword((value) => !value)} style={{ position: 'absolute', right: 10, top: 10, border: 0, background: 'transparent', color: muted }}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></label>
              {mode === 'login' && <button type="button" onClick={() => navigate('/login/forgot-password')} style={{ justifySelf: 'end', border: 0, background: 'transparent', color: '#2563eb', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>¿Olvidaste tu contraseña?</button>}
              {error && <div style={{ color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', padding: 10, borderRadius: 8, fontSize: 13 }}>{error}</div>}
              <button disabled={loading} type="submit" style={{ padding: 13, border: 0, borderRadius: 10, background: '#2563eb', color: '#fff', fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Conectando con el backend…' : mode === 'register' ? 'Crear cuenta y enviar código' : 'Continuar con código de correo'} <ArrowRight size={16} /></button>
            </form>
          </> : <>
            <button type="button" onClick={() => setStep('credentials')} style={{ border: 0, background: 'transparent', color: '#2563eb', padding: 0 }}><ArrowLeft size={14} /> Cambiar cuenta</button><h2>Confirma tu acceso al Plan Free</h2><p style={{ color: muted, fontSize: 13 }}>Enviamos un código de verificación de 6 dígitos a <strong>{email}</strong>. Revisa tu bandeja de entrada y también la carpeta de spam.</p>
            <div style={{ background: isDark ? '#172554' : '#eff6ff', border: '1px solid #bfdbfe', padding: 12, borderRadius: 9, fontSize: 12, marginBottom: 14, color: isDark ? '#dbeafe' : '#1e3a8a' }}><strong>Plan Free: confirma tu correo</strong><br />Copia el código de 6 números que recibiste por correo. El código es temporal y solo puede usarse una vez.</div>
            <form onSubmit={handleVerifyEmailCode} style={{ display: 'grid', gap: 16 }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 7 }}>{codeDigits.map((digit, index) => <input key={index} ref={(element) => { codeRefs.current[index] = element; }} value={digit} onChange={(event) => handleCodeChange(index, event.target.value)} maxLength={1} inputMode="numeric" style={{ width: '100%', height: 52, textAlign: 'center', fontSize: 20, borderRadius: 9, border: '1px solid #cbd5e1', background: isDark ? '#0f172a' : '#f8fafc', color: foreground }} />)}</div>{error && <div style={{ color: '#b91c1c', background: '#fee2e2', padding: 10, borderRadius: 8, fontSize: 13 }}>{error}</div>}<button disabled={loading} type="submit" style={{ padding: 13, border: 0, borderRadius: 10, background: '#2563eb', color: '#fff', fontWeight: 800 }}>{loading ? 'Verificando…' : 'Verificar código y entrar'} <ArrowRight size={16} /></button></form>
          </>}
        </div>
      </section>
    </main>
  );
}
