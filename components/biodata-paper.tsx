import Image from 'next/image';
import type { CSSProperties } from 'react';
import { getTemplateById, type TemplateId } from '../lib/template-catalog';
import type { DevotionalArtwork } from '../lib/devotional-artwork';
import type { UploadedArtwork } from '../lib/uploaded-artwork';

export type FieldSection = 'personal' | 'family' | 'contact' | 'preferences';
export type ProfileField = { id: string; label: string; value: string; section: FieldSection; group?: string };
export type BorderStyle = 'classic' | 'floral' | 'arch' | 'minimal' | 'rounded' | 'oval' | 'circle' | 'double';
export type FrameStyle = 'template' | 'square' | 'rounded' | 'arch' | 'oval' | 'circle' | 'double';
export type BackgroundStyle = 'template' | 'plain' | 'parchment' | 'dots' | 'geometric' | 'weave' | 'radiant';
export type TemplateColors = { paper: string; primary: string; accent: string; text: string };
export type TemplateDesign = { name: string; note: string; primary: string; accent: string; paper: string; text: string; borderStyle: BorderStyle; photoShape: 'circle' | 'rounded' | 'square'; layout: 'classic' | 'portrait-top'; fontStyle: 'classic' | 'modern' | 'traditional'; blessing: string; blessingOverride?: string; density?: 'compact' | 'balanced' | 'airy'; artwork?: DevotionalArtwork };

export function BiodataPaper({ template, photo, name, about, fields, design, uploadedArtwork, frameStyle = 'template', backgroundStyle = 'template', colorOverride, compact = false }: { template: TemplateId; photo: string; name: string; about: string; fields: ProfileField[]; design?: TemplateDesign; uploadedArtwork?: UploadedArtwork; frameStyle?: FrameStyle; backgroundStyle?: BackgroundStyle; colorOverride?: TemplateColors; compact?: boolean }) {
  const personal = fields.filter((field) => field.section === 'personal' && field.label.trim() && field.value.trim());
  const family = fields.filter((field) => field.section === 'family' && field.label.trim() && field.value.trim());
  const contact = fields.filter((field) => field.section === 'contact' && field.label.trim() && field.value.trim());
  const preferences = fields.filter((field) => field.section === 'preferences' && field.label.trim() && field.value.trim());
  const baseTemplate = template === 'ai-custom' ? undefined : getTemplateById(template);
  const isAiTemplate = template === 'ai-custom' && design !== undefined;
  const isAiFinished = template !== 'ai-custom' && design !== undefined;
  const activeColors = colorOverride || (design ? { paper: design.paper, primary: design.primary, accent: design.accent, text: design.text } : undefined) || (baseTemplate ? { paper: baseTemplate.theme.paper, primary: baseTemplate.theme.primary, accent: baseTemplate.theme.accent, text: baseTemplate.theme.text } : design ? { paper: design.paper, primary: design.primary, accent: design.accent, text: design.text } : { paper: '#fffdf8', primary: '#8f3d2f', accent: '#c79a45', text: '#493b34' });
  const activeVariables = { '--uploaded-artwork-height': uploadedArtwork?.size === 'small' ? '12cqw' : uploadedArtwork?.size === 'large' ? '25cqw' : '18cqw', '--active-paper': activeColors.paper, '--active-primary': activeColors.primary, '--active-accent': activeColors.accent, '--active-text': activeColors.text };
  const style = baseTemplate
    ? ({ ...activeVariables, '--template-paper': activeColors.paper, '--template-primary': activeColors.primary, '--template-accent': activeColors.accent, '--template-text': activeColors.text, '--template-muted': colorOverride ? `color-mix(in srgb, ${activeColors.text} 72%, ${activeColors.paper})` : baseTemplate.theme.muted, '--template-contact': colorOverride ? `color-mix(in srgb, ${activeColors.accent} 12%, ${activeColors.paper})` : baseTemplate.theme.contact } as CSSProperties)
    : isAiTemplate
      ? ({ ...activeVariables, '--design-primary': activeColors.primary, '--design-accent': activeColors.accent, '--design-paper': activeColors.paper, '--design-text': activeColors.text } as CSSProperties)
      : (activeVariables as CSSProperties);
  const artworkClass = template === 'mahadev-parvati-devotional' && (design?.artwork === 'mahadev-radha-krishna' || design?.artwork === 'radha-krishna-replacement') ? `artwork-${design.artwork}` : '';
  const designClasses = design ? `design-${design.borderStyle} photo-${design.photoShape} layout-${design.layout} font-${design.fontStyle} density-${design.density || 'balanced'} ${artworkClass}` : '';
  const frameClass = frameStyle === 'template' ? '' : `frame-${frameStyle}`;
  const backgroundClass = backgroundStyle === 'template' ? '' : `background-${backgroundStyle}`;
  const classes = `bio-paper ${template} ${baseTemplate ? 'template-themed' : ''} ${isAiTemplate ? 'ai-custom' : ''} ${isAiFinished ? 'ai-finished' : ''} ${designClasses} ${frameClass} ${backgroundClass} ${compact ? 'compact' : ''}`;
  const blessing = design?.blessingOverride !== undefined ? design.blessingOverride : isAiTemplate && design.blessing ? design.blessing : baseTemplate?.blessing || design?.blessing || 'Marriage biodata';
  const displayName = name.trim() || 'Your name';
  const replaceHeader = uploadedArtwork?.placement === 'replace-header' && ['mahadev-parvati-devotional', 'radha-krishna-devotional', 'shri-ram-devotional'].includes(template);
  const artworkPlacement = replaceHeader ? 'replace-header' : uploadedArtwork?.placement === 'below-details' ? 'below-details' : 'above-details';
  const extraImage = uploadedArtwork && <div className={`uploaded-artwork artwork-placement-${artworkPlacement} artwork-size-${uploadedArtwork.size}`}><Image src={uploadedArtwork.src} alt="Uploaded biodata artwork" fill unoptimized loading="eager" /></div>;
  const groups = new Map<string, ProfileField[]>();
  for (const field of fields) {
    if (!field.group?.trim() || !field.value.trim()) continue;
    const title = field.group.trim();
    groups.set(title, [...(groups.get(title) || []), field]);
  }

  return <article className={classes} style={style} aria-hidden={compact || undefined}>
    <div className="ornament top" aria-hidden="true">✦</div>
    <div className="bio-blessing">{blessing}</div>
    <div className="bio-header"><div><small>Marriage biodata</small><h2>{displayName}</h2>{about.trim() && <p>{about}</p>}</div><div className="portrait-frame">{photo ? <Image src={photo} alt={`${displayName} profile`} fill unoptimized /> : <span className="portrait-placeholder">Add photo</span>}</div></div>
    {replaceHeader && extraImage}
    <div className={`bio-sections ${uploadedArtwork && artworkPlacement === 'above-details' ? 'with-artwork-above' : ''}`}>
      {uploadedArtwork && artworkPlacement === 'above-details' && extraImage}
      {personal.some(f => !f.group) && <section className="bio-section personal"><h3>Personal details</h3><dl>{personal.filter(f => !f.group).map((field) => <div key={field.id}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl></section>}
      {family.some(f => !f.group) && <section className="bio-section family"><h3>Family details</h3><dl>{family.filter(f => !f.group).map((field) => <div key={field.id}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl></section>}
      {preferences.some(f => !f.group) && <section className="bio-section preferences"><h3>Partner preferences</h3><dl>{preferences.filter(f => !f.group).map((field) => <div key={field.id}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl></section>}
      {contact.some(f => !f.group) && <section className="bio-contact"><h3>Contact details</h3>{contact.filter(f => !f.group).map((field) => <span key={field.id}>{field.label}: {field.value}</span>)}</section>}
      {[...groups].map(([title, items]) => <section className="bio-section custom-group" key={title}><h3>{title}</h3><dl>{items.map(field => <div key={field.id}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl></section>)}
      {uploadedArtwork && artworkPlacement === 'below-details' && extraImage}
    </div>
    <div className="ornament bottom" aria-hidden="true">✦</div>
  </article>;
}

