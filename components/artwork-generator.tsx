'use client';

import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { artworkSource, defaultArtworkArea, isArtworkReplacement, matchesArtwork, type ArtworkArea, type ArtworkReplacement } from '../lib/artwork-generation';
import { readApiResponse } from '../lib/read-api-response';
import Image from 'next/image';
import { createUploadedArtworkPreview } from '../lib/uploaded-artwork-preview';

export type ArtworkGeneratorHandle = { prepare: (prompt: string) => void };
export function ArtworkGenerator({ ref, template, variant = 'template', current, signature, disabled, renderPreview, onApply, onBusyChange }: {
  ref?: Ref<ArtworkGeneratorHandle>; template: string; variant?: string; current?: ArtworkReplacement; signature: string; disabled: boolean;
  renderPreview: (replacement: ArtworkReplacement) => ReactNode; onApply: (replacement: ArtworkReplacement | null) => Promise<void>; onBusyChange: (busy: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [area, setArea] = useState<ArtworkArea>(() => defaultArtworkArea(template));
  const [crop, setCrop] = useState({ x: 50, y: 50 });
  const [reference, setReference] = useState<string>();
  const [state, setState] = useState<'idle' | 'uploading' | 'generating' | 'saving'>('idle');
  const [error, setError] = useState('');
  const [candidate, setCandidate] = useState<{ replacement: ArtworkReplacement; key: string }>();
  const controller = useRef<AbortController | undefined>(undefined);
  const panel = useRef<HTMLElement>(null);
  const source = matchesArtwork(current, template, variant) ? current!.src : artworkSource(template, variant);
  const key = JSON.stringify({ signature, template, variant, prompt, area, reference, crop });
  const latestKey = useRef(key);
  useEffect(() => { latestKey.current = key; }, [key]);
  const candidateReady = candidate?.key === key ? candidate.replacement : undefined;
  const busy = state !== 'idle';
  useImperativeHandle(ref, () => ({ prepare: text => { setOpen(true); setPrompt(text); setCandidate(undefined); setError(''); setTimeout(() => panel.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0); } }), []);
  useEffect(() => () => { controller.current?.abort(); onBusyChange(false); }, [onBusyChange]);
  async function uploadReference(file: File | undefined) {
    if (!file || busy || disabled) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5_000_000 || file.size === 0) { setError('Choose a JPG, PNG or WebP under 5 MB.'); return; }
    const abort = new AbortController(); controller.current = abort;
    setState('uploading'); onBusyChange(true);
    try {
      const form = new FormData(); form.set('purpose', 'artwork'); form.set('photo', file);
      const response = await fetch('/api/photo', { method: 'POST', body: form, signal: abort.signal });
      const data = await readApiResponse<{ url?: string }>(response, 'The artwork reference could not be uploaded.');
      if (!response.ok || !data.url) throw new Error(data.error || 'The artwork reference could not be uploaded.');
      if (!abort.signal.aborted) { setReference(data.url);  setCandidate(undefined);  }
    } catch (failure) { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : 'The reference could not be uploaded.'); }
    finally { if (controller.current === abort) { setState('idle'); onBusyChange(false); } }
  }
  async function preparePreview() {
    if (busy || disabled) return;
    const abort = new AbortController(); controller.current = abort;
    const startedKey = key;
    setState('generating'); onBusyChange(true); setError(''); setCandidate(undefined);
    try {
      if (!reference || !source) throw new Error('Upload the picture you want to use first.');
      const blob = await createUploadedArtworkPreview(source, reference, area, crop);
      if (abort.signal.aborted) return;
      const form = new FormData(); form.set('purpose', 'replacement'); form.set('photo', blob, 'artwork.png');
      const response = await fetch('/api/photo', { method: 'POST', body: form, signal: abort.signal });
      const saved = await readApiResponse<{ url?: string }>(response, 'The replacement could not be stored.');
      const replacement = { src: saved.url || '', template, variant };
      if (!response.ok || !isArtworkReplacement(replacement)) throw new Error(saved.error || 'The replacement could not be stored.');
      if (abort.signal.aborted) return;
      if (latestKey.current !== startedKey) throw new Error('Your choices changed while preparing the image. Review a new preview; nothing was applied.');
      setCandidate({ replacement, key: startedKey });
    } catch (failure) { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : 'The artwork could not be prepared. Your biodata is unchanged.'); }
    finally { if (controller.current === abort) { setState('idle'); onBusyChange(false); } }
  }
  async function apply(replacement: ArtworkReplacement | null) {
    if (busy || disabled) return;
    setState('saving'); onBusyChange(true); setError('');
    try { await onApply(replacement); setCandidate(undefined);  }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'The artwork could not be saved. Your biodata is unchanged.'); }
    finally { setState('idle'); onBusyChange(false); }
  }
  if (!source) return null;
  return <section ref={panel} className="artwork-generator mt-5 rounded-xl border border-[#dacabb] bg-[#fcfaf6] p-4" aria-label="Replace uploaded artwork">
    <button type="button" className="soft-button w-full justify-center" aria-expanded={open} disabled={busy || disabled} onClick={() => setOpen(!open)}>Replace artwork with an uploaded image</button>
    {open && <div className="mt-4 space-y-4">
      <p className="text-sm leading-6">Upload the picture you want to use, select the area to replace, and adjust the crop. Preview it before saving. Your profile photo, text and the rest of the design stay in place.</p>
      {prompt && <p className="text-xs">Your request: {prompt}. Upload the replacement picture below; this tool places your image directly.</p>}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
        <div className="relative self-start overflow-hidden rounded border bg-white" aria-label="Selected artwork area preview">
          {/* A plain template background: no customer portrait or biodata is sent for editing. */}
          <Image src={source} width={1024} height={1536} unoptimized alt="Current template artwork with the area to edit outlined" className="block h-auto w-full" />
          <div className="pointer-events-none absolute border-2 border-dashed border-[#e47619] bg-orange-200/20" style={{ left: `${area.x}%`, top: `${area.y}%`, width: `${area.width}%`, height: `${area.height}%` }} />
        </div>
        <fieldset disabled={busy || disabled} className="space-y-3"><legend className="field-label mb-2">Area to replace (% of page)</legend>
          {(['x', 'y', 'width', 'height'] as const).map(property => <label key={property} className="block text-xs"><span className="flex justify-between">{{ x: 'Left', y: 'Top', width: 'Width', height: 'Height' }[property]}<output>{area[property]}%</output></span><input aria-label={`Artwork area ${property}`} className="mt-1 w-full" type="range" min={property === 'x' || property === 'y' ? 1 : 5} max={property === 'x' ? 99 - area.width : property === 'y' ? 99 - area.height : property === 'width' ? 99 - area.x : 99 - area.y} step="1" value={area[property]} onChange={e => { setArea({ ...area, [property]: Number(e.target.value) });  }} /></label>)}
          <button type="button" className="soft-button text-xs" onClick={() => { setArea(defaultArtworkArea(template));  }}>Reset selected area</button>
        </fieldset>
      </div>
      <label className="field-label block">Replacement artwork image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || disabled} className="mt-2 block w-full text-xs" onChange={e => { void uploadReference(e.target.files?.[0]); e.target.value = ''; }} /></label>
      {state === 'uploading' && <output className="text-xs">Uploading the reference privately…</output>}
      {reference && <div className="space-y-3"><Image src={reference} width={160} height={96} unoptimized alt="Uploaded replacement artwork" className="h-24 max-w-full rounded border object-contain" />
        {(['x', 'y'] as const).map(axis => <label className="field-label block" key={axis}>Image crop {axis === 'x' ? 'horizontal' : 'vertical'}<input className="block w-full" type="range" min="0" max="100" value={crop[axis]} disabled={busy} onChange={e => setCrop({ ...crop, [axis]: Number(e.target.value) })} /></label>)}
        <button className="soft-button text-xs" type="button" disabled={busy} onClick={() => { setReference(undefined);  }}>Remove image</button></div>}
      <p className="privacy-note">Your uploaded artwork is placed directly and stored privately with your account. It is not sent to OpenAI or Groq. No image-generation API credits are needed. Transparent areas use an ivory base, and the image is cropped to fill the selected area.</p>
      {state === 'generating' && <output className="text-sm">Preparing your uploaded artwork preview…</output>}
      {error && <p role="alert" className="ai-error">{error}</p>}
      {candidateReady && <div className="space-y-3" aria-label="Uploaded artwork preview"><h3 className="font-serif text-xl">Review the replacement in your biodata</h3><div className="artwork-result-preview">{renderPreview(candidateReady)}</div><p className="text-xs">Only the selected background area changes. Applying saves this picture with your existing details.</p><div className="flex flex-wrap gap-3"><button type="button" className="primary-button" disabled={busy || disabled} onClick={() => void apply(candidateReady)}>Apply artwork & save</button><button type="button" className="soft-button" disabled={busy} onClick={() => { setCandidate(undefined);  }}>Discard preview</button></div></div>}
      {!candidateReady && <button type="button" className="primary-button" disabled={busy || disabled || !reference} onClick={() => void preparePreview()}>Preview replacement</button>}
      {state === 'generating' && <button type="button" className="soft-button ml-3" onClick={() => { controller.current?.abort(); controller.current = undefined; setState('idle'); onBusyChange(false); }}>Cancel request</button>}
      {matchesArtwork(current, template, variant) && <button type="button" className="soft-button ml-3" disabled={busy || disabled} onClick={() => void apply(null)}>Restore original artwork & save</button>}
    </div>}
  </section>;
}
