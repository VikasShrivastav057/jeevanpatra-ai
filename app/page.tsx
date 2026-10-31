'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LayoutTemplate, Palette, Sparkles, WandSparkles, X } from 'lucide-react';
import { templateCatalog } from '../lib/template-catalog';
import { readApiResponse } from '../lib/read-api-response';
import { BiodataPaper, type TemplateDesign } from '../components/biodata-paper';

export default function TemplateGallery() {
  const [category, setCategory] = useState('All');
  const [accountState, setAccountState] = useState<'checking' | 'signed-in' | 'signed-out'>('checking');
  const [accountRole, setAccountRole] = useState<'customer' | 'admin'>('customer');
  const [designOpen, setDesignOpen] = useState(false);
  const [designIdea, setDesignIdea] = useState('A royal traditional biodata in deep maroon and antique gold, with an elegant arch, subtle floral details and a circular portrait.');
  const [designState, setDesignState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [designError, setDesignError] = useState('');
  const categories = ['All', 'Hindu', 'Jain', 'Muslim', 'Christian', 'Traditional', 'Modern', 'Classic', 'Professional'];
  const visible = useMemo(() => category === 'All' ? templateCatalog : templateCatalog.filter((item) => item.category === category), [category]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/session', { cache: 'no-store' })
      .then(async (response) => {
        const payload = response.ok ? await response.json() as { signedIn?: unknown; role?: unknown } : undefined;
        if (!cancelled) { setAccountState(payload?.signedIn === true ? 'signed-in' : 'signed-out'); setAccountRole(payload?.role === 'admin' ? 'admin' : 'customer'); }
      })
      .catch(() => { if (!cancelled) setAccountState('signed-out'); });
    return () => { cancelled = true; };
  }, []);

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAccountState('signed-out'); setAccountRole('customer');
  }

  function chooseTemplate(id: string) {
    try {
      const existing = sessionStorage.getItem('jeevanpatra-create-draft');
      const draft = existing ? JSON.parse(existing) as Record<string, unknown> : {};
      sessionStorage.setItem('jeevanpatra-create-draft', JSON.stringify({ ...draft, template: id, customDesign: undefined, finishDesign: undefined }));
    } catch { sessionStorage.removeItem('jeevanpatra-create-draft'); }
    window.location.assign(`/create?template=${encodeURIComponent(id)}`);
  }
  async function createAiDesign() {
    if (!designIdea.trim()) return;
    setDesignState('loading'); setDesignError('');
    try {
      const response = await fetch('/api/ai/design', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idea: designIdea }) });
      const data = await readApiResponse<{ design?: TemplateDesign }>(response, 'AI could not create this design.');
      if (!response.ok || !data.design) throw new Error(data.error || 'AI could not create this design.');
      sessionStorage.setItem('jeevanpatra-ai-design', JSON.stringify(data.design));
      window.location.href = '/create?template=ai-custom';
    } catch (error) { setDesignState('error'); setDesignError(error instanceof Error ? error.message : 'Something went wrong.'); }
  }

  return <main className="min-h-screen bg-[#f7f7f6] text-[var(--ink)]">
    <header className="sticky top-0 z-40 border-b border-[#2f493f18] bg-[#fbf8f0f2] backdrop-blur-xl"><div className="mx-auto flex min-h-[74px] max-w-[1480px] items-center justify-between gap-3 px-4 py-2 sm:px-5 lg:px-9"><a className="flex min-w-0 items-center gap-2 sm:gap-3" href="#top" aria-label="JeevanPatra home"><span className="logo-mark">ज</span><span className="min-w-0"><strong className="block truncate font-serif text-[18px] sm:text-[20px]">JeevanPatra</strong><small className="hidden text-[9px] font-bold uppercase tracking-[.19em] text-[var(--muted)] sm:block">Choose · Create · Share</small></span></a><div className="flex flex-none items-center gap-1 sm:gap-3">{accountState === 'signed-in' ? <>{accountRole === 'admin' ? <Link className="rounded-full px-2 py-2.5 text-xs font-bold text-[var(--teal)] sm:px-4 sm:text-sm" href="/admin">Admin dashboard</Link> : <span className="px-2 py-2.5 text-xs font-bold text-[var(--teal)] sm:px-4 sm:text-sm">Customer account</span>}<button className="rounded-full px-2 py-2.5 text-xs font-bold sm:px-3" onClick={() => void signOut()}>Sign out</button></> : accountState === 'signed-out' ? <button type="button" className="rounded-full px-2 py-2.5 text-xs font-bold sm:px-4 sm:text-sm" onClick={() => window.location.assign('/login?return_to=/')}>Sign in / Sign up</button> : <span className="sr-only" aria-live="polite">Checking account</span>}<button className="primary-button px-3 sm:px-[18px]" onClick={() => setDesignOpen(true)}><WandSparkles size={16} /><span className="hidden sm:inline">Design with AI</span><span className="sm:hidden">AI design</span></button></div></div></header>

    <section id="top" className="template-market-hero"><div className="mx-auto max-w-[1280px] px-5 py-16 text-center lg:px-9"><div className="eyebrow"><Sparkles size={14} /> Step 1 · Choose your design</div><h1 className="mx-auto mt-5 max-w-[900px] font-serif text-[clamp(3rem,6vw,5.8rem)] leading-[.93] tracking-[-.045em]">Begin with a design that feels like <em className="text-[var(--marigold)]">you.</em></h1><p className="mx-auto mt-6 max-w-[700px] text-lg leading-8 text-[var(--muted)]">Browse traditional, modern and community-inspired templates. Select one to continue to the details page, or ask AI to create a completely personal design.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><button className="primary-button px-6 py-3.5" onClick={() => document.querySelector('#gallery')?.scrollIntoView({ behavior: 'smooth' })}><LayoutTemplate size={17} /> Explore templates</button><button className="soft-button px-6 py-3.5" onClick={() => setDesignOpen(true)}><Palette size={17} /> Describe a design to AI</button></div><div className="market-steps"><span className="active"><b>1</b> Choose design</span><i /><span><b>2</b> Add details</span><i /><span><b>3</b> AI finishing</span></div></div></section>

    <section id="gallery" className="mx-auto max-w-[1480px] px-5 pb-24 lg:px-9"><div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow"><LayoutTemplate size={14} /> Template collection</p><h2 className="mt-3 font-serif text-4xl lg:text-5xl">Made for every story.</h2></div><fieldset className="category-pills"><legend className="sr-only">Filter templates by category</legend>{categories.map((item) => <button key={item} aria-pressed={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</fieldset></div><div className="template-market-grid">{visible.map((item) => <article className="market-card" key={item.id}><a className={`market-preview ${item.id}`} style={{ background: item.theme.stage }} href={`/create?template=${encodeURIComponent(item.id)}`} onClick={(event) => { event.preventDefault(); chooseTemplate(item.id); }} aria-label={`Use ${item.name} template`}><BiodataPaper template={item.id} photo="" name="Your name" about="" fields={[]} compact />{item.popular && <span className="popular-badge">Popular</span>}</a><div className="market-card-copy"><div><h3>{item.name}</h3><p>{item.category} · {item.note}</p></div><button aria-label={`Use ${item.name} template`} onClick={() => chooseTemplate(item.id)}>Use template <ArrowRight size={14} /></button></div></article>)}</div></section>

    <section className="ai-market-banner"><div><span className="modal-icon"><WandSparkles /></span><div><p className="eyebrow">Can’t find the right one?</p><h2>Let AI turn your idea into a template.</h2><p>Describe the colors, culture, era, border, portrait style and mood you want.</p></div></div><button className="primary-button" onClick={() => setDesignOpen(true)}>Create my design <Sparkles size={16} /></button></section>

    <footer className="border-t border-[#29483f18] bg-[#fbf8f0] px-5 py-8 text-sm text-[var(--muted)]"><div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4"><span className="flex items-center gap-2 font-serif text-lg font-bold text-[var(--ink)]"><span className="logo-mark small">ज</span> JeevanPatra</span><p>First choose the design. Add your private details only on the next page.</p></div></footer>

    {designOpen && <Modal label="AI template designer" onClose={() => setDesignOpen(false)}><div className="modal-icon"><Palette /></div><p className="eyebrow mx-auto w-fit">AI template designer</p><h2 className="mt-4 text-center font-serif text-3xl">Tell us what you imagine.</h2><p className="mt-3 text-center text-sm leading-6 text-[var(--muted)]">Example: “Old royal style, ivory paper, deep red and gold, carved arch and a round photo.”</p><label className="field-label mt-6">Your design idea<textarea rows={6} value={designIdea} onChange={(event) => setDesignIdea(event.target.value)} /></label>{designError && <p className="ai-error" role="alert">{designError}</p>}<button className="primary-button mt-6 w-full justify-center py-3.5" onClick={createAiDesign} disabled={designState === 'loading' || !designIdea.trim()}><WandSparkles size={17} /> {designState === 'loading' ? 'Designing with Groq…' : 'Create and continue'}</button></Modal>}
  </main>;
}

function Modal({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (dialog.current && !dialog.current.open) dialog.current.showModal(); }, []);
  function close() { if (dialog.current?.open) dialog.current.close(); else onClose(); }
  return <dialog ref={dialog} className="modal-card" aria-label={label} aria-modal="true" onClose={onClose}><button className="modal-close" onClick={close} aria-label="Close dialog"><X size={18} /></button>{children}</dialog>;
}

