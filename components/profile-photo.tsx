'use client';

import Image from 'next/image';
import { useRef, type CSSProperties, type PointerEvent, type KeyboardEvent } from 'react';
import { boundPhotoPlacement, defaultPhotoCrop, dragPhotoCrop, type PhotoAdjustment, type PhotoCrop, type PhotoPlacement } from '../lib/photo-adjustment';

function cropStyle(crop: PhotoCrop): CSSProperties {
  return { objectFit: 'cover', objectPosition: `${crop.x}% ${crop.y}%`, transform: `scale(${crop.zoom})`, transformOrigin: `${crop.x}% ${crop.y}%` };
}

export function ProfilePhoto({ src, name, adjustment, onPlacementChange, onMoveEnd }: { src: string; name: string; adjustment?: PhotoAdjustment; onPlacementChange?: (placement: PhotoPlacement) => void; onMoveEnd?: () => void }) {
  const drag = useRef<{ id: number; x: number; y: number; placement: PhotoPlacement; width: number; height: number } | undefined>(undefined);
  const placement = adjustment?.placement;
  const style: CSSProperties | undefined = placement ? { position: 'absolute', top: `${placement.y}%`, left: `${placement.x}%`, width: `${placement.width}%`, right: 'auto', bottom: 'auto', height: 'auto', aspectRatio: '1', margin: 0, padding: 0, zIndex: 5 } : undefined;
  const image = src ? <Image src={src} alt={`${name} profile`} fill unoptimized loading="eager" draggable={false} style={adjustment ? cropStyle(adjustment.crop) : undefined} /> : <span className="portrait-placeholder">Add photo</span>;
  if (!onPlacementChange || !placement) return <div className={`portrait-frame ${placement ? 'portrait-manual' : ''}`} data-profile-photo="true" style={style}>{image}</div>;
  function start(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !placement) return;
    const paper = event.currentTarget.closest('.bio-paper')?.getBoundingClientRect();
    if (!paper?.width || !paper.height) return;
    event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, placement, width: paper.width, height: paper.height };
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    onPlacementChange?.(boundPhotoPlacement({ ...d.placement, x: d.placement.x + (event.clientX - d.x) / d.width * 100, y: d.placement.y + (event.clientY - d.y) / d.height * 100 }));
  }
  function key(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape') { event.preventDefault(); onMoveEnd?.(); return; }
    const amount = event.shiftKey ? 5 : 1;
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount] };
    const delta = arrows[event.key];
    if (delta && placement) { event.preventDefault(); onPlacementChange?.(boundPhotoPlacement({ ...placement, x: placement.x + delta[0], y: placement.y + delta[1] })); }
  }
  return <button type="button" className="portrait-frame portrait-manual portrait-editable" data-profile-photo="true" data-photo-edit="true" style={style} aria-label="Drag profile photo to position it. Arrow keys move; Shift moves faster; Escape finishes." onPointerDown={start} onPointerMove={move} onPointerUp={() => { drag.current = undefined; }} onPointerCancel={() => { drag.current = undefined; }} onLostPointerCapture={() => { drag.current = undefined; }} onKeyDown={key}>{image}</button>;
}

export function PhotoCropEditor({ src, crop, onChange, radius }: { src: string; crop: PhotoCrop; onChange: (crop: PhotoCrop) => void; radius: string }) {
  const dimensions = useRef({ width: 0, height: 0 });
  const drag = useRef<{ id: number; x: number; y: number; width: number; height: number; crop: PhotoCrop } | undefined>(undefined);
  function start(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, width: rect.width, height: rect.height, crop };
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (d?.id === event.pointerId) onChange(dragPhotoCrop(d.crop, event.clientX - d.x, event.clientY - d.y, d.width, d.height, dimensions.current.width, dimensions.current.height));
  }
  return <div className="photo-crop-controls">
    <button type="button" className="photo-crop-stage" style={{ borderRadius: radius }} aria-label="Drag photo to adjust crop" onPointerDown={start} onPointerMove={move} onPointerUp={() => { drag.current = undefined; }} onPointerCancel={() => { drag.current = undefined; }} onLostPointerCapture={() => { drag.current = undefined; }} onKeyDown={event => {
      const arrows: Record<string, [number, number]> = { ArrowLeft: [2, 0], ArrowRight: [-2, 0], ArrowUp: [0, 2], ArrowDown: [0, -2] };
      const delta = arrows[event.key];
      if (delta) { event.preventDefault(); onChange({ ...crop, x: Math.min(100, Math.max(0, crop.x + delta[0])), y: Math.min(100, Math.max(0, crop.y + delta[1])) }); }
    }}><Image src={src} alt="Profile photo crop preview" fill unoptimized loading="eager" draggable={false} style={cropStyle(crop)} onLoad={event => { dimensions.current = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }; }} /></button>
    <p>Drag to frame your face, or use the controls below. Zoom in for a closer crop.</p>
    <label htmlFor="profile-crop-zoom">Photo zoom <output>{crop.zoom.toFixed(2)}×</output><input id="profile-crop-zoom" type="range" min="1" max="3" step="0.01" value={crop.zoom} onChange={event => onChange({ ...crop, zoom: Number(event.target.value) })} /></label>
    <label>Crop left / right<input type="range" min="0" max="100" step="0.1" value={crop.x} onChange={event => onChange({ ...crop, x: Number(event.target.value) })} /></label>
    <label>Crop up / down<input type="range" min="0" max="100" step="0.1" value={crop.y} onChange={event => onChange({ ...crop, y: Number(event.target.value) })} /></label>
    <button className="soft-button" type="button" onClick={() => onChange({ ...defaultPhotoCrop })}>Reset crop</button>
  </div>;
}

