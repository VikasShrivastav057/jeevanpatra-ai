import Image from 'next/image';
import type { CSSProperties } from 'react';
import { getTemplateById, type TemplateId } from '../lib/template-catalog';

export type FieldSection = 'personal' | 'family' | 'contact' | 'preferences';
export type ProfileField = { id: string; label: string; value: string; section: FieldSection };
export type BorderStyle = 'classic' | 'floral' | 'arch' | 'minimal' | 'rounded' | 'oval' | 'circle' | 'double';
export type FrameStyle = 'template' | 'square' | 'rounded' | 'arch' | 'oval' | 'circle' | 'double';
export type BackgroundStyle = 'template' | 'plain' | 'parchment' | 'dots' | 'geometric' | 'weave' | 'radiant';
export type TemplateColors = { paper: string; primary: string; accent: string; text: string };
export type TemplateDesign = { name: string; note: string; primary: string; accent: string; paper: string; text: string; borderStyle: BorderStyle; photoShape: 'circle' | 'rounded' | 'square'; layout: 'classic' | 'portrait-top'; fontStyle: 'classic' | 'modern' | 'traditional'; blessing: string };

export function BiodataPaper({ template, photo, name, about, fields, design, frameStyle = 'template', backgroundStyle = 'template', colorOverride, compact = false }: { template: TemplateId; photo: string; name: string; about: string; fields: ProfileField[]; design?: TemplateDesign; frameStyle?: FrameStyle; backgroundStyle?: BackgroundStyle; colorOverride?: TemplateColors; compact?: boolean }) {
  const personal = fields.filter((field) => field.section === 'personal' && field.label.trim() && field.value.trim());
  const family = fields.filter((field) => field.section === 'family' && field.label.trim() && field.value.trim());
  const contact = fields.filter((field) => field.section === 'contact' && field.label.trim() && field.value.trim());
  const preferences = fields.filter((field) => field.section === 'preferences' && field.label.trim() && field.value.trim());
  const baseTemplate = template === 'ai-custom' ? undefined : getTemplateById(template);
  const isAiTemplate = template === 'ai-custom' && design !== undefined;
  const isAiFinished = template !== 'ai-custom' && design !== undefined;
  const activeColors = colorOverride || (baseTemplate ? { paper: baseTemplate.theme.paper, primary: baseTemplate.theme.primary, accent: baseTemplate.theme.accent, text: baseTemplate.theme.text } : design ? { paper: design.paper, primary: design.primary, accent: design.accent, text: design.text } : { paper: '#fffdf8', primary: '#8f3d2f', accent: '#c79a45', text: '#493b34' });
  const activeVariables = { '--active-paper': activeColors.paper, '--active-primary': activeColors.primary, '--active-accent': activeColors.accent, '--active-text': activeColors.text };
  const style = baseTemplate
    ? ({ ...activeVariables, '--template-paper': activeColors.paper, '--template-primary': activeColors.primary, '--template-accent': activeColors.accent, '--template-text': activeColors.text, '--template-muted': colorOverride ? `color-mix(in srgb, ${activeColors.text} 72%, ${activeColors.paper})` : baseTemplate.theme.muted, '--template-contact': colorOverride ? `color-mix(in srgb, ${activeColors.accent} 12%, ${activeColors.paper})` : baseTemplate.theme.contact } as CSSProperties)
    : isAiTemplate
      ? ({ ...activeVariables, '--design-primary': activeColors.primary, '--design-accent': activeColors.accent, '--design-paper': activeColors.paper, '--design-text': activeColors.text } as CSSProperties)
      : (activeVariables as CSSProperties);
  const designClasses = design ? `design-${design.borderStyle} photo-${design.photoShape} layout-${design.layout} font-${design.fontStyle}` : '';
  const frameClass = frameStyle === 'template' ? '' : `frame-${frameStyle}`;
  const backgroundClass = backgroundStyle === 'template' ? '' : `background-${backgroundStyle}`;
  const classes = `bio-paper ${template} ${baseTemplate ? 'template-themed' : ''} ${isAiTemplate ? 'ai-custom' : ''} ${isAiFinished ? 'ai-finished' : ''} ${designClasses} ${frameClass} ${backgroundClass} ${compact ? 'compact' : ''}`;
  const blessing = isAiTemplate && design.blessing ? design.blessing : baseTemplate?.blessing || design?.blessing || 'Marriage biodata';
  const displayName = name.trim() || 'Your name';

  return <article className={classes} style={style} aria-hidden={compact || undefined}>
    <div className="ornament top" aria-hidden="true">✦</div>
    <div className="bio-blessing">{blessing}</div>
    <div className="bio-header"><div><small>Marriage biodata</small><h2>{displayName}</h2>{about.trim() && <p>{about}</p>}</div><div className="portrait-frame">{photo ? <Image src={photo} alt={`${displayName} profile`} fill unoptimized /> : <span className="portrait-placeholder">Add photo</span>}</div></div>
    <div className="bio-sections">
      {personal.length > 0 && <section className="bio-section personal"><h3>Personal details</h3><dl>{personal.map((field) => <div key={field.id}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl></section>}
      {family.length > 0 && <section className="bio-section family"><h3>Family details</h3><dl>{family.map((field) => <div key={field.id}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl></section>}
      {preferences.length > 0 && <section className="bio-section preferences"><h3>Partner preferences</h3><dl>{preferences.map((field) => <div key={field.id}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl></section>}
      {contact.length > 0 && <section className="bio-contact"><h3>Contact details</h3>{contact.map((field) => <span key={field.id}>{field.label}: {field.value}</span>)}</section>}
    </div>
    <div className="ornament bottom" aria-hidden="true">✦</div>
  </article>;
}
