'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, KeyRound, LogIn, Mail, ShieldCheck, UserPlus } from 'lucide-react';

type Mode = 'customer' | 'admin';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('customer');
  const [customerMode, setCustomerMode] = useState<'login' | 'signup'>('login');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const returnTo = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    const value = new URLSearchParams(window.location.search).get('return_to') || '/';
    return value.startsWith('/') && !value.startsWith('//') ? value : '/';
  }, []);

  useEffect(() => {
    fetch('/api/session', { cache: 'no-store' }).then(async (response) => {
      const data = response.ok ? await response.json() as { signedIn?: boolean; role?: string } : {};
      if (data.signedIn) {
        const destination = data.role === 'admin' || !returnTo.startsWith('/admin') ? returnTo : '/';
        window.location.replace(destination);
      }
    }).catch(() => undefined);
  }, [returnTo]);

  async function customerAccess(event: { preventDefault: () => void }) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (customerMode === 'signup' && customerPassword !== confirmPassword) throw new Error('The passwords do not match.');
      const response = await fetch(`/api/auth/customer-${customerMode}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: customerEmail, password: customerPassword }) });
      const data = await readJson(response) as { error?: string };
      if (!response.ok) throw new Error(data.error || (customerMode === 'signup' ? 'The account could not be created.' : 'Sign-in failed.'));
      window.location.assign(returnTo);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Customer access failed.'); }
    finally { setBusy(false); }
  }

  async function adminLogin(event: { preventDefault: () => void }) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/admin-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: adminEmail, password: adminPassword }) });
      const data = await readJson(response) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Admin sign-in failed.');
      window.location.assign(returnTo);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Admin sign-in failed.'); }
    finally { setBusy(false); }
  }

  function chooseMode(next: Mode) {
    setMode(next); setError('');
  }

  function chooseCustomerMode(next: 'login' | 'signup') {
    setCustomerMode(next); setError(''); setCustomerPassword(''); setConfirmPassword('');
  }

  return <main className="auth-page">
    <section className="auth-brand-panel">
      <Link className="auth-back" href="/"><ArrowLeft size={16} /> Back to templates</Link>
      <div className="auth-brand-copy"><span className="logo-mark">ज</span><p className="eyebrow">JeevanPatra accounts</p><h1>Your biodata stays private, editable and yours.</h1><p>Create one customer account, then use the same email and password whenever you return.</p></div>
      <div className="auth-trust-list"><span><ShieldCheck /> Secure access</span><span><KeyRound /> Private sessions</span><span><Mail /> Account activity history</span></div>
    </section>
    <section className="auth-form-panel">
      <div className="auth-card">
        <div className="auth-tabs" role="tablist" aria-label="Account type"><button role="tab" aria-selected={mode === 'customer'} className={mode === 'customer' ? 'active' : ''} onClick={() => chooseMode('customer')}>Customer</button><button role="tab" aria-selected={mode === 'admin'} className={mode === 'admin' ? 'active' : ''} onClick={() => chooseMode('admin')}>Admin</button></div>
        {mode === 'customer' ? <>
          <div className="auth-card-heading"><span className="auth-icon">{customerMode === 'signup' ? <UserPlus /> : <LogIn />}</span><p className="eyebrow">Customer access</p><h2>{customerMode === 'signup' ? 'Create your customer account.' : 'Welcome back.'}</h2><p>{customerMode === 'signup' ? 'Your password is securely protected and can be used for future visits.' : 'Sign in using the email and password you created.'}</p></div>
          <fieldset className="customer-account-switch"><legend className="sr-only">Customer account action</legend><button type="button" className={customerMode === 'login' ? 'active' : ''} onClick={() => chooseCustomerMode('login')}>Sign in</button><button type="button" className={customerMode === 'signup' ? 'active' : ''} onClick={() => chooseCustomerMode('signup')}>Create account</button></fieldset>
          <form onSubmit={customerAccess} className="auth-form"><label>Email address<input type="email" autoComplete="username" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="name@example.com" required /></label><label>Password<input type="password" autoComplete={customerMode === 'signup' ? 'new-password' : 'current-password'} minLength={8} maxLength={128} value={customerPassword} onChange={(event) => setCustomerPassword(event.target.value)} required /></label>{customerMode === 'signup' && <><label>Confirm password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label><p className="auth-password-help">Use at least 8 characters with one letter and one number.</p></>}<button className="primary-button auth-submit" disabled={busy}>{busy ? (customerMode === 'signup' ? 'Creating account…' : 'Signing in…') : (customerMode === 'signup' ? 'Create account and continue' : 'Sign in and continue')}</button></form>
        </> : <>
          <div className="auth-card-heading"><span className="auth-icon"><ShieldCheck /></span><p className="eyebrow">Administrator</p><h2>Enter the complete studio.</h2><p>Create biodata with all customer features. Use Admin controls on the right whenever you want to review accounts, creations and downloads.</p></div>
          <form onSubmit={adminLogin} className="auth-form"><label>Admin email<input type="email" autoComplete="username" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} required /></label><button className="primary-button auth-submit" disabled={busy}>{busy ? 'Signing in…' : 'Enter website as admin'}</button></form>
        </>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <p className="auth-privacy">Passwords are stored as secure one-way hashes. Administrators can never view customer passwords.</p>
      </div>
    </section>
  </main>;
}

async function readJson(response: Response) {
  try { return await response.json() as unknown; } catch { return {}; }
}

