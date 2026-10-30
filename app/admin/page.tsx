'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Activity, Download, FileText, LogOut, RefreshCw, ShieldCheck, Users } from 'lucide-react';

type RecordValue = Record<string, unknown>;
type Overview = {
  counts: { customers?: number; creations?: number; completed?: number; downloads?: number };
  users: Array<RecordValue>;
  profiles: Array<RecordValue>;
  activities: Array<RecordValue>;
};

export default function AdminPage() {
  const [data, setData] = useState<Overview>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'customers' | 'creations' | 'activity'>('customers');

  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/overview', { cache: 'no-store' });
      if (response.status === 401 || response.status === 403) { window.location.replace('/login?return_to=/admin'); return; }
      const payload = await response.json() as Overview & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'The dashboard could not be loaded.');
      setData(payload);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The dashboard could not be loaded.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);
  const visibleActivities = useMemo(() => data?.activities || [], [data]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  }

  return <main className="admin-page">
    <header className="admin-header"><Link href="/" className="admin-brand"><span className="logo-mark small">ज</span><span><strong>JeevanPatra</strong><small>Admin control centre</small></span></Link><div><span className="admin-secure"><ShieldCheck size={16} /> Administrator</span><button className="soft-button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button><button className="soft-button" onClick={() => void logout()}><LogOut size={15} /> Sign out</button></div></header>
    <section className="admin-shell">
      <div className="admin-heading"><div><p className="eyebrow">Live account oversight</p><h1>Customer activity, clearly organised.</h1><p>See who created an account, when they signed in, what biodata they created and every completed download.</p></div><span className="admin-live"><i /> Live data</span></div>
      {error && <div className="admin-error" role="alert">{error}<button onClick={() => void load()}>Try again</button></div>}
      <div className="admin-metrics"><Metric icon={<Users />} label="Customer accounts" value={data?.counts.customers} /><Metric icon={<FileText />} label="Biodata created" value={data?.counts.creations} /><Metric icon={<ShieldCheck />} label="Completed" value={data?.counts.completed} /><Metric icon={<Download />} label="Downloads" value={data?.counts.downloads} /></div>
      <nav className="admin-tabs" aria-label="Dashboard views"><button className={tab === 'customers' ? 'active' : ''} onClick={() => setTab('customers')}>Customers</button><button className={tab === 'creations' ? 'active' : ''} onClick={() => setTab('creations')}>Creations</button><button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>Activity history</button></nav>
      <section className="admin-content" aria-live="polite">
        {loading && !data ? <div className="admin-empty">Loading secure dashboard…</div> : tab === 'customers' ? <CustomerTable rows={data?.users || []} /> : tab === 'creations' ? <CreationCards rows={data?.profiles || []} /> : <ActivityTable rows={visibleActivities} />}
      </section>
    </section>
  </main>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number }) {
  return <article className="admin-metric"><span>{icon}</span><div><strong>{value ?? '—'}</strong><small>{label}</small></div></article>;
}

function CustomerTable({ rows }: { rows: Array<RecordValue> }) {
  if (!rows.length) return <div className="admin-empty">No customer accounts yet.</div>;
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Joined</th><th>Last login</th><th>Creations</th><th>Downloads</th></tr></thead><tbody>{rows.map((row) => <tr key={textValue(row.id)}><td><strong>{textValue(row.identifier, 'Unknown')}</strong><small>{textValue(row.identifierType)}</small></td><td>{formatDate(row.createdAt)}</td><td>{formatDate(row.lastLoginAt)}</td><td>{numberValue(row.creations)}</td><td>{numberValue(row.downloads)}</td></tr>)}</tbody></table></div>;
}

function CreationCards({ rows }: { rows: Array<RecordValue> }) {
  if (!rows.length) return <div className="admin-empty">No biodata has been saved yet.</div>;
  return <div className="creation-admin-grid">{rows.map((row) => {
    const details = isRecord(row.details) ? row.details : {};
    const fields = Array.isArray(details.profileFields) ? details.profileFields.filter(isRecord) : [];
    return <article className="creation-admin-card" key={textValue(row.id)}><div className="creation-admin-top"><span className={`status-pill ${row.status === 'completed' ? 'complete' : ''}`}>{row.status === 'completed' ? 'Completed' : 'Draft'}</span><small>{formatDate(row.updatedAt)}</small></div><h2>{textValue(row.name, 'Untitled biodata')}</h2><p className="creation-owner">{textValue(row.identifier, 'Unknown customer')}</p><dl><div><dt>Template</dt><dd>{textValue(row.template, '—')}</dd></div><div><dt>Created</dt><dd>{formatDate(row.createdAt)}</dd></div><div><dt>Completed</dt><dd>{row.completedAt ? formatDate(row.completedAt) : 'Not completed'}</dd></div></dl>{typeof row.introduction === 'string' && row.introduction ? <p className="creation-intro">{row.introduction}</p> : null}<details><summary>View customer fields ({fields.length})</summary><div className="creation-fields">{fields.map((field, index) => <p key={`${textValue(field.id)}-${index}`}><strong>{textValue(field.label, 'Field')}</strong><span>{textValue(field.value, '—')}</span></p>)}</div></details></article>;
  })}</div>;
}

function ActivityTable({ rows }: { rows: Array<RecordValue> }) {
  if (!rows.length) return <div className="admin-empty">No account activity yet.</div>;
  return <div className="activity-list">{rows.map((row) => { const details = isRecord(row.details) ? row.details : {}; return <article key={textValue(row.id)}><span className="activity-icon"><Activity size={17} /></span><div><strong>{actionLabel(textValue(row.action, 'activity'))}</strong><p>{textValue(row.actorIdentifier, 'Unknown')} · {textValue(row.actorRole)}</p><small>{formatDate(row.createdAt)}{typeof details.ip === 'string' ? ` · ${details.ip}` : ''}{typeof details.template === 'string' ? ` · ${details.template}` : ''}</small>{typeof details.browser === 'string' ? <details><summary>Browser details</summary><p>{details.browser}</p></details> : null}</div></article>; })}</div>;
}

function formatDate(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number) || number <= 0) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(number));
}

function actionLabel(action: string) {
  return ({ account_created: 'Customer account created', login: 'Customer signed in', customer_login_failed: 'Customer sign-in failed', admin_login: 'Administrator signed in', logout: 'Signed out', biodata_created: 'Biodata created', biodata_updated: 'Biodata updated', download: 'Completed biodata downloaded' } as Record<string, string>)[action] || action.replace(/_/g, ' ');
}

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function textValue(value: unknown, fallback = '') {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function numberValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
