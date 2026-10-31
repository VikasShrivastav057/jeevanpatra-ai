'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Check, ChevronDown, LayoutTemplate, ListPlus, Menu, Palette, Plus, Sparkles, Trash2, Upload, WandSparkles, X } from 'lucide-react';
import { builtInTemplateIds, getTemplateById, templateCatalog, type TemplateId } from '../../lib/template-catalog';
import { readApiResponse } from '../../lib/read-api-response';
import { printBiodata } from '../../lib/print-biodata';
import { isUploadedArtwork, type UploadedArtwork } from '../../lib/uploaded-artwork';
import type { FinishResult } from '../../lib/finishing-plan';
import { PhotoCropEditor } from '../../components/profile-photo';
import { boundPhotoPlacement, defaultPhotoCrop, isPhotoAdjustment, resizePhoto, sameExceptPhotoAdjustment, type PhotoAdjustment, type PhotoCrop } from '../../lib/photo-adjustment';
import { BiodataPaper, type BackgroundStyle, type FieldSection, type FrameStyle, type ProfileField, type TemplateColors, type TemplateDesign } from '../../components/biodata-paper';

type AiTone = 'warm' | 'concise' | 'traditional';
type ColorPresetId = 'template' | 'maroon' | 'emerald' | 'navy' | 'rose' | 'purple' | 'teal' | 'custom';
type FinishChangeTarget = 'layout' | 'colors' | 'typography' | 'photo' | 'border' | 'spacing' | 'sections' | 'header' | 'introduction';
type FinishImprovementMode = 'requested-only' | 'balanced' | 'best-version';
const templates: { id: TemplateId; name: string; note: string }[] = templateCatalog.map((item) => ({ id: item.id, name: item.name, note: item.editorNote }));
const initialFields: ProfileField[] = [
  { id: 'dob', label: 'Date of birth', value: '', section: 'personal' },
  { id: 'birth-time', label: 'Time of birth', value: '', section: 'personal' },
  { id: 'birth-place', label: 'Place of birth', value: '', section: 'personal' },
  { id: 'height', label: 'Height', value: '', section: 'personal' },
  { id: 'profession', label: 'Profession', value: '', section: 'personal' },
  { id: 'education', label: 'Education', value: '', section: 'personal' },
  { id: 'religion', label: 'Religion', value: '', section: 'personal' },
  { id: 'father', label: 'Father', value: '', section: 'family' },
  { id: 'mother', label: 'Mother', value: '', section: 'family' },
  { id: 'siblings', label: 'Siblings', value: '', section: 'family' },
  { id: 'location', label: 'Address', value: '', section: 'contact' },
  { id: 'phone', label: 'Phone', value: '', section: 'contact' },
];

const templateIds = [...builtInTemplateIds, 'ai-custom'] as TemplateId[];
const frameStyleOptions: { id: FrameStyle; label: string; note: string }[] = [
  { id: 'template', label: 'Original', note: 'Use the template border' },
  { id: 'square', label: 'Square', note: 'Clean straight corners' },
  { id: 'rounded', label: 'Rounded', note: 'Soft rounded corners' },
  { id: 'arch', label: 'Arch', note: 'Curved ceremonial top' },
  { id: 'oval', label: 'Oval', note: 'Full-page oval frame' },
  { id: 'circle', label: 'Circle', note: 'Circular feature frame' },
  { id: 'double', label: 'Double', note: 'Formal double border' },
];
const backgroundStyleOptions: { id: BackgroundStyle; label: string; note: string }[] = [
  { id: 'template', label: 'Original', note: 'Keep the selected template print' },
  { id: 'plain', label: 'Plain', note: 'Clean paper without a pattern' },
  { id: 'parchment', label: 'Parchment', note: 'Soft old-paper texture' },
  { id: 'dots', label: 'Dotted', note: 'Delicate repeating dots' },
  { id: 'geometric', label: 'Geometric', note: 'Subtle diamond pattern' },
  { id: 'weave', label: 'Weave', note: 'Fine crossed texture' },
  { id: 'radiant', label: 'Radiant', note: 'Gentle ceremonial glow' },
];
const colorPresets: { id: ColorPresetId; label: string; colors?: TemplateColors }[] = [
  { id: 'template', label: 'Original' },
  { id: 'maroon', label: 'Maroon gold', colors: { paper: '#fff8ec', primary: '#84252b', accent: '#d5a23f', text: '#4b2928' } },
  { id: 'emerald', label: 'Emerald gold', colors: { paper: '#f7f6e8', primary: '#145c48', accent: '#c4a04a', text: '#203b33' } },
  { id: 'navy', label: 'Navy ivory', colors: { paper: '#fffdf4', primary: '#193b62', accent: '#b9924b', text: '#26384a' } },
  { id: 'rose', label: 'Rose blush', colors: { paper: '#fff7f6', primary: '#9b4f63', accent: '#d8a49f', text: '#5d3943' } },
  { id: 'purple', label: 'Royal purple', colors: { paper: '#fff9ee', primary: '#612b72', accent: '#c79c48', text: '#462d4b' } },
  { id: 'teal', label: 'Teal pearl', colors: { paper: '#f5fbf8', primary: '#12636a', accent: '#d2a448', text: '#21464a' } },
  { id: 'custom', label: 'Custom' },
];
const defaultCustomColors: TemplateColors = { paper: '#fff8ec', primary: '#84252b', accent: '#d5a23f', text: '#4b2928' };
const finishChangeOptions: { id: FinishChangeTarget; label: string; note: string }[] = [
  { id: 'layout', label: 'Layout', note: 'Placement and columns' },
  { id: 'colors', label: 'Colours', note: 'Palette and contrast' },
  { id: 'typography', label: 'Fonts', note: 'Type style and hierarchy' },
  { id: 'photo', label: 'Photo', note: 'Shape and position' },
  { id: 'border', label: 'Border & print', note: 'Frame and background' },
  { id: 'spacing', label: 'Spacing', note: 'Balance and readability' },
  { id: 'sections', label: 'Sections', note: 'Order and grouping' },
  { id: 'header', label: 'Header', note: 'Name and blessing style' },
  { id: 'introduction', label: 'Introduction', note: 'Polish your own paragraph' },
];
const finishImprovementOptions: { id: FinishImprovementMode; label: string; note: string }[] = [
  { id: 'requested-only', label: 'Only my changes', note: 'Keep everything else exactly as it is.' },
  { id: 'balanced', label: 'Improve gently', note: 'Apply my changes and fix obvious balance or readability issues.' },
  { id: 'best-version', label: 'Create the best version', note: 'Use the selected areas and AI judgement for a stronger result.' },
];
const draftKey = 'jeevanpatra-create-draft';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isTemplateDesign(value: unknown): value is TemplateDesign {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<TemplateDesign>;
  return ['name', 'note', 'primary', 'accent', 'paper', 'text', 'blessing'].every((key) => typeof item[key as keyof TemplateDesign] === 'string')
    && ['classic', 'floral', 'arch', 'minimal', 'rounded', 'oval', 'circle', 'double'].includes(item.borderStyle || '')
    && ['circle', 'rounded', 'square'].includes(item.photoShape || '')
    && ['classic', 'portrait-top'].includes(item.layout || '')
    && ['classic', 'modern', 'traditional'].includes(item.fontStyle || '')
    && (item.density === undefined || ['compact', 'balanced', 'airy'].includes(item.density));
}

function isFrameStyle(value: unknown): value is FrameStyle {
  return frameStyleOptions.some((option) => option.id === value);
}

function isBackgroundStyle(value: unknown): value is BackgroundStyle {
  return backgroundStyleOptions.some((option) => option.id === value);
}

function isColorPresetId(value: unknown): value is ColorPresetId {
  return colorPresets.some((option) => option.id === value);
}

function isTemplateColors(value: unknown): value is TemplateColors {
  if (!isRecord(value)) return false;
  return ['paper', 'primary', 'accent', 'text'].every((key) => typeof value[key] === 'string' && /^#[0-9a-f]{6}$/i.test(value[key] as string));
}

function isProfileField(value: unknown): value is ProfileField {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ProfileField>;
  return typeof item.id === 'string' && typeof item.label === 'string' && typeof item.value === 'string' && ['personal', 'family', 'contact', 'preferences'].includes(item.section || '');
}

function hasMeaningfulDraftFields(fields: ProfileField[] | undefined) {
  if (!fields) return false;
  if (fields.some((field) => field.value.trim())) return true;
  if (fields.length !== initialFields.length) return true;
  return fields.some((field, index) => {
    const initial = initialFields[index];
    return !initial || field.id !== initial.id || field.label !== initial.label || field.section !== initial.section;
  });
}

function templatePreviewStyle(template: TemplateId, customDesign?: TemplateDesign): CSSProperties | undefined {
  if (template === 'ai-custom') {
    if (!customDesign) return undefined;
    return { background: customDesign.paper, borderColor: customDesign.primary, color: customDesign.text, '--template-paper': customDesign.paper, '--template-primary': customDesign.primary, '--template-accent': customDesign.accent, '--template-text': customDesign.text } as CSSProperties;
  }
  const theme = getTemplateById(template)?.theme;
  if (!theme) return undefined;
  return { background: theme.paper, borderColor: theme.primary, color: theme.text, '--template-stage': theme.stage, '--template-paper': theme.paper, '--template-primary': theme.primary, '--template-accent': theme.accent, '--template-text': theme.text, '--template-muted': theme.muted, '--template-contact': theme.contact } as CSSProperties;
}

function completionSignature(value: {
  name: string;
  about: string;
  profileFields: ProfileField[];
  template: TemplateId;
  customDesign?: TemplateDesign;
  finishDesign?: TemplateDesign;
  frameStyle: FrameStyle;
  backgroundStyle: BackgroundStyle;
  colorPreset: ColorPresetId;
  customColors: TemplateColors;
  uploadedArtwork?: UploadedArtwork;
  photoAdjustment?: PhotoAdjustment;
}) {
  return JSON.stringify(value);
}

export default function Home() {
  const [template, setTemplate] = useState<TemplateId>('saffron');
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoAdjustment, setPhotoAdjustment] = useState<PhotoAdjustment>();
  const [photoCropOpen, setPhotoCropOpen] = useState(false);
  const [photoCropDraft, setPhotoCropDraft] = useState<PhotoCrop>({ ...defaultPhotoCrop });
  const [photoCropRadius, setPhotoCropRadius] = useState('50%');
  const [photoMoveMode, setPhotoMoveMode] = useState(false);
  const [photoDropActive, setPhotoDropActive] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [saveState, setSaveState] = useState('Save my biodata');
  const [saveError, setSaveError] = useState('');
  const [accountState, setAccountState] = useState<'checking' | 'signed-in' | 'signed-out'>('checking');
  const [accountRole, setAccountRole] = useState<'customer' | 'admin'>('customer');
  const [photoKey, setPhotoKey] = useState<string>();
  const [photoState, setPhotoState] = useState<'idle' | 'uploading' | 'saved' | 'error'>('idle');
  const [photoError, setPhotoError] = useState('');
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [aiError, setAiError] = useState('');
  const [aiTone, setAiTone] = useState<AiTone>('warm');
  const [extraOpen, setExtraOpen] = useState(true);
  const [profileFields, setProfileFields] = useState<ProfileField[]>(initialFields);
  const [designIdea, setDesignIdea] = useState('An elegant ivory biodata with deep maroon borders, subtle lotus flowers and a circular portrait.');
  const [designReference, setDesignReference] = useState('');
  const [designReferenceName, setDesignReferenceName] = useState('');
  const [designState, setDesignState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [designError, setDesignError] = useState('');
  const [customDesign, setCustomDesign] = useState<TemplateDesign>();
  const [finishDesign, setFinishDesign] = useState<TemplateDesign>();
  const [frameStyle, setFrameStyle] = useState<FrameStyle>('template');
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>('template');
  const [colorPreset, setColorPreset] = useState<ColorPresetId>('template');
  const [customColors, setCustomColors] = useState<TemplateColors>(defaultCustomColors);
  const [finishOpen, setFinishOpen] = useState(false);
  const [stylePreference, setStylePreference] = useState('Traditional');
  const [styleRecommendation, setStyleRecommendation] = useState('Elegant, balanced and family-friendly. Keep every fact accurate and make the page easy to read.');
  const [finishChangeTargets, setFinishChangeTargets] = useState<FinishChangeTarget[]>(['layout', 'colors', 'typography', 'spacing']);
  const [finishImprovementMode, setFinishImprovementMode] = useState<FinishImprovementMode>('requested-only');
  const [finishState, setFinishState] = useState<'idle' | 'loading' | 'saving' | 'error'>('idle');
  const [finishError, setFinishError] = useState('');
  const [finishReview, setFinishReview] = useState<{ result: FinishResult; signature: string; requestKey: string }>();
  const [lastFinishChanges, setLastFinishChanges] = useState<string[]>([]);
  const finishRequest = useRef<AbortController | undefined>(undefined);
  const [uploadedArtwork, setUploadedArtwork] = useState<UploadedArtwork>();
  const [artworkUploadState, setArtworkUploadState] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [artworkUploadError, setArtworkUploadError] = useState('');
  const artworkInput = useRef<HTMLInputElement>(null);
  const [fieldBuilderOpen, setFieldBuilderOpen] = useState(false);
  const [fieldIdea, setFieldIdea] = useState('');
  const [fieldBuilderState, setFieldBuilderState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [fieldBuilderError, setFieldBuilderError] = useState('');
  const [suggestedFields, setSuggestedFields] = useState<ProfileField[]>([]);
  const [completedSignature, setCompletedSignature] = useState('');
  const [downloadState, setDownloadState] = useState<'idle' | 'checking'>('idle');
  const [draftReady, setDraftReady] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const designReferenceInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const photoObjectUrl = useRef<string | undefined>(undefined);
  const photoUploadRequest = useRef<AbortController | undefined>(undefined);
  const availableTemplates = useMemo(() => customDesign ? [...templates, { id: 'ai-custom' as const, name: customDesign.name, note: 'Created with AI' }] : templates, [customDesign]);
  const active = useMemo(() => availableTemplates.find((item) => item.id === template) || availableTemplates[0], [availableTemplates, template]);
  const quickTemplates = useMemo(() => {
    const first = availableTemplates.slice(0, 4);
    if (first.some((item) => item.id === template)) return first;
    const selected = availableTemplates.find((item) => item.id === template);
    return selected ? [...first.slice(0, 3), selected] : first;
  }, [availableTemplates, template]);
  const activeColorOverride = useMemo(() => {
    if (colorPreset === 'template') return undefined;
    if (colorPreset === 'custom') return customColors;
    return colorPresets.find((option) => option.id === colorPreset)?.colors;
  }, [colorPreset, customColors]);
  const currentCompletionSignature = useMemo(() => completionSignature({ name, about, profileFields, template, customDesign, finishDesign, frameStyle, backgroundStyle, colorPreset, customColors, uploadedArtwork, photoAdjustment }), [about, backgroundStyle, colorPreset, customColors, customDesign, finishDesign, frameStyle, name, profileFields, template, uploadedArtwork, photoAdjustment]);
  const latestFinishSignature = useRef(currentCompletionSignature);
  latestFinishSignature.current = currentCompletionSignature;
  const finishRequestKey = JSON.stringify({ styleRecommendation, stylePreference, finishChangeTargets, finishImprovementMode });
  const currentFinishReview = finishReview?.signature === currentCompletionSignature && finishReview.requestKey === finishRequestKey ? finishReview : undefined;
  useEffect(() => () => finishRequest.current?.abort(), []);
  const isCompleted = Boolean(completedSignature && completedSignature === currentCompletionSignature);
  const photoChangesNeedSave = !isCompleted && sameExceptPhotoAdjustment(completedSignature, currentCompletionSignature);

  useEffect(() => {
    let cancelled = false;
    async function hydrateDraft() {
      const requested = new URLSearchParams(window.location.search).get('template');
      let restoredName: string | undefined;
      let restoredAbout: string | undefined;
      let restoredFields: ProfileField[] | undefined;
      let restoredTemplate: TemplateId | undefined;
      let restoredCustomDesign: TemplateDesign | undefined;
      let restoredFinishDesign: TemplateDesign | undefined;
      let restoredFrameStyle: FrameStyle | undefined;
      let restoredBackgroundStyle: BackgroundStyle | undefined;
      let restoredColorPreset: ColorPresetId | undefined;
      let restoredCustomColors: TemplateColors | undefined;
      let restoredPhotoKey: string | undefined;
      let restoredCompletedSignature: string | undefined;
      let savedProfileCustomDesign: TemplateDesign | undefined;
      let restoredUploadedArtwork: UploadedArtwork | undefined;
      let restoredPhotoAdjustment: PhotoAdjustment | undefined;
      let draftHasPhotoSetting = false;
      let draftHasArtworkSetting = false;
      let draftHasProfileData = false;
      let resolvedAccountState: 'signed-in' | 'signed-out' = 'signed-out';

      try {
        const savedDraft = sessionStorage.getItem(draftKey);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft) as { name?: unknown; about?: unknown; profileFields?: unknown; template?: unknown; customDesign?: unknown; finishDesign?: unknown; frameStyle?: unknown; backgroundStyle?: unknown; colorPreset?: unknown; customColors?: unknown; photoKey?: unknown; uploadedArtwork?: unknown; photoAdjustment?: unknown };
          draftHasPhotoSetting = 'photoAdjustment' in draft;
          if (isPhotoAdjustment(draft.photoAdjustment)) restoredPhotoAdjustment = draft.photoAdjustment;
          draftHasArtworkSetting = 'uploadedArtwork' in draft;
          if (isUploadedArtwork(draft.uploadedArtwork)) restoredUploadedArtwork = draft.uploadedArtwork;
          if (typeof draft.name === 'string') restoredName = draft.name;
          if (typeof draft.about === 'string') restoredAbout = draft.about;
          if (Array.isArray(draft.profileFields) && draft.profileFields.every(isProfileField)) restoredFields = draft.profileFields;
          if (typeof draft.photoKey === 'string') restoredPhotoKey = draft.photoKey;
          if (!requested && templateIds.includes(draft.template as TemplateId)) restoredTemplate = draft.template as TemplateId;
          if (!requested && draft.template === 'ai-custom' && isTemplateDesign(draft.customDesign)) restoredCustomDesign = draft.customDesign;
          if ((!requested || requested === draft.template) && draft.template !== 'ai-custom' && isTemplateDesign(draft.finishDesign)) restoredFinishDesign = draft.finishDesign;
          if (isFrameStyle(draft.frameStyle)) restoredFrameStyle = draft.frameStyle;
          if (isBackgroundStyle(draft.backgroundStyle)) restoredBackgroundStyle = draft.backgroundStyle;
          if (isColorPresetId(draft.colorPreset)) restoredColorPreset = draft.colorPreset;
          if (isTemplateColors(draft.customColors)) restoredCustomColors = draft.customColors;
          draftHasProfileData = Boolean(restoredName?.trim() || restoredAbout?.trim() || restoredPhotoKey || hasMeaningfulDraftFields(restoredFields));
        }
      } catch { sessionStorage.removeItem(draftKey); }

      try {
        const sessionResponse = await fetch('/api/session', { cache: 'no-store' });
        const session = sessionResponse.ok ? await sessionResponse.json() as unknown : undefined;
        resolvedAccountState = isRecord(session) && session.signedIn === true ? 'signed-in' : 'signed-out';
        if (isRecord(session) && session.role === 'admin') setAccountRole('admin');
      } catch { resolvedAccountState = 'signed-out'; }

      try {
        const response = await fetch('/api/biodata', { cache: 'no-store' });
        const payload = response.ok ? await response.json() as unknown : undefined;
        const profile = isRecord(payload) && isRecord(payload.profile) ? payload.profile : undefined;
        const details = profile && isRecord(profile.details) ? profile.details : undefined;
        if (!draftHasPhotoSetting && details && isPhotoAdjustment(details.photoAdjustment)) restoredPhotoAdjustment = details.photoAdjustment;
        if (!draftHasArtworkSetting && details && isUploadedArtwork(details.uploadedArtwork)) restoredUploadedArtwork = details.uploadedArtwork;
        if (profile?.template === 'ai-custom' && details && isTemplateDesign(details.customDesign)) savedProfileCustomDesign = details.customDesign;
        if (details && restoredBackgroundStyle === undefined && isBackgroundStyle(details.backgroundStyle)) restoredBackgroundStyle = details.backgroundStyle;
        if (details && restoredColorPreset === undefined && isColorPresetId(details.colorPreset)) restoredColorPreset = details.colorPreset;
        if (details && restoredCustomColors === undefined && isTemplateColors(details.customColors)) restoredCustomColors = details.customColors;
        if (profile?.status === 'completed' && details && typeof details.completionSignature === 'string') restoredCompletedSignature = details.completionSignature;
        if (!draftHasProfileData) {
          if (profile) {
            if (typeof profile.name === 'string') restoredName = profile.name;
            if (typeof profile.introduction === 'string') restoredAbout = profile.introduction;
            if (typeof profile.photoKey === 'string') restoredPhotoKey = profile.photoKey;
            if (!requested && templateIds.includes(profile.template as TemplateId)) restoredTemplate = profile.template as TemplateId;
            if (details && Array.isArray(details.profileFields) && details.profileFields.every(isProfileField)) restoredFields = details.profileFields;
            if (details && isFrameStyle(details.frameStyle)) restoredFrameStyle = details.frameStyle;
            if (!requested && savedProfileCustomDesign) restoredCustomDesign = savedProfileCustomDesign;
            if ((!requested || requested === profile.template) && profile.template !== 'ai-custom' && details && isTemplateDesign(details.finishDesign)) restoredFinishDesign = details.finishDesign;
          }
        }
      } catch { /* Session editing remains available when account storage is offline. */ }

      if (requested && templateIds.includes(requested as TemplateId)) restoredTemplate = requested as TemplateId;
      if (requested === 'ai-custom') {
        try {
          const stored = sessionStorage.getItem('jeevanpatra-ai-design');
          const parsed = stored ? JSON.parse(stored) : undefined;
          if (isTemplateDesign(parsed)) restoredCustomDesign = parsed;
          else if (savedProfileCustomDesign) restoredCustomDesign = savedProfileCustomDesign;
          else if (!restoredCustomDesign) restoredTemplate = 'saffron';
        } catch {
          sessionStorage.removeItem('jeevanpatra-ai-design');
          if (savedProfileCustomDesign) restoredCustomDesign = savedProfileCustomDesign;
          else if (!restoredCustomDesign) restoredTemplate = 'saffron';
        }
      } else if (requested) {
        restoredCustomDesign = undefined;
      }

      if (cancelled) return;
      if (restoredUploadedArtwork?.placement === 'replace-header' && !(restoredTemplate || 'saffron').endsWith('-devotional')) restoredUploadedArtwork = { ...restoredUploadedArtwork, placement: 'above-details' };
      setAccountState(resolvedAccountState);
      if (restoredName !== undefined) setName(restoredName);
      if (restoredAbout !== undefined) setAbout(restoredAbout);
      if (restoredFields) setProfileFields(restoredFields);
      if (restoredTemplate) setTemplate(restoredTemplate);
      if (restoredCustomDesign) setCustomDesign(restoredCustomDesign);
      if (restoredFinishDesign) setFinishDesign(restoredFinishDesign);
      if (restoredFrameStyle) setFrameStyle(restoredFrameStyle);
      if (restoredBackgroundStyle) setBackgroundStyle(restoredBackgroundStyle);
      if (restoredColorPreset) setColorPreset(restoredColorPreset);
      if (restoredCustomColors) setCustomColors(restoredCustomColors);
      if (restoredCompletedSignature) setCompletedSignature(restoredCompletedSignature);
      if (restoredUploadedArtwork) setUploadedArtwork(restoredUploadedArtwork);
      if (restoredPhotoAdjustment) setPhotoAdjustment(restoredPhotoAdjustment);
      if (restoredPhotoKey) {
        const filename = restoredPhotoKey.split('/').at(-1);
        if (filename && /^portrait\.(?:jpg|png)$/.test(filename)) { setPhotoKey(restoredPhotoKey); setPhoto(`/api/photo/${filename}`); }
      }
      setDraftReady(true);
    }
    void hydrateDraft();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => { photoUploadRequest.current?.abort(); if (photoObjectUrl.current) URL.revokeObjectURL(photoObjectUrl.current); }, []);
  useEffect(() => {
    if (!photoMoveMode) return;
    document.querySelector('.preview-shell')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelector<HTMLButtonElement>('[data-photo-edit]')?.focus({ preventScroll: true });
  }, [photoMoveMode]);

  useEffect(() => {
    if (!draftReady) return;
    sessionStorage.setItem(draftKey, JSON.stringify({ name, about, profileFields, template, customDesign, finishDesign, frameStyle, backgroundStyle, colorPreset, customColors, photoKey, uploadedArtwork: uploadedArtwork ?? null, photoAdjustment: photoAdjustment ?? null }));
  }, [about, backgroundStyle, colorPreset, customColors, customDesign, draftReady, finishDesign, frameStyle, name, photoKey, profileFields, template, uploadedArtwork, photoAdjustment]);

  useEffect(() => {
    const context = (document as unknown as { modelContext?: { registerTool?: (tool: unknown, options?: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'stage_biodata_profile',
      title: 'Stage biodata profile',
      description: 'Fill the visible biodata preview with a name, introduction, and selected design.',
      inputSchema: { type: 'object', properties: { name: { type: 'string' }, introduction: { type: 'string' }, template: { type: 'string', enum: templates.map((item) => item.id) } }, required: ['name', 'introduction', 'template'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const value = input as { name?: unknown; introduction?: unknown; template?: unknown };
        if (typeof value.name !== 'string' || !value.name.trim() || typeof value.introduction !== 'string' || !templates.some((item) => item.id === value.template)) throw new Error('Provide a name, introduction, and valid template.');
        const nextTemplate = value.template as TemplateId;
        setName(value.name.trim()); setAbout(value.introduction.trim()); setTemplate(nextTemplate); setCustomDesign(undefined); setFinishDesign(undefined);
        const url = new URL(window.location.href);
        url.searchParams.set('template', nextTemplate);
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
        document.querySelector('#editor')?.scrollIntoView({ behavior: 'smooth' });
        return { status: 'staged', name: value.name.trim(), template: value.template };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  async function handlePhoto(file?: File) {
    if (!file || photoUploadRequest.current) return;
    setPhotoError('');
    if (!['image/jpeg', 'image/png'].includes(file.type) || !file.size || file.size > 5_000_000) {
      setPhotoState('error'); setPhotoError('Choose a JPG or PNG image under 5 MB.'); return;
    }
    const controller = new AbortController(); photoUploadRequest.current = controller;
    setPhotoState('uploading');
    const nextUrl = URL.createObjectURL(file);
    try {
      const image = new window.Image(); image.src = nextUrl;
      try { await image.decode(); } catch { throw new Error('This file could not be opened as a photo. Choose a valid JPG or PNG.'); }
      const form = new FormData(); form.append('photo', file);
      const response = await fetch('/api/photo', { method: 'POST', body: form, signal: controller.signal });
      const data = await readApiResponse<{ key?: string }>(response, 'The photo could not be uploaded.');
      if (!response.ok || !data.key) throw new Error(data.error || (response.status === 401 ? 'Sign in to save this photo with your biodata.' : 'The photo could not be uploaded.'));
      if (controller.signal.aborted) { URL.revokeObjectURL(nextUrl); return; }
      if (photoObjectUrl.current) URL.revokeObjectURL(photoObjectUrl.current);
      photoObjectUrl.current = nextUrl;
      setPhoto(nextUrl); setPhotoKey(data.key); setPhotoState('saved');
      setPhotoAdjustment(current => current ? { ...current, crop: { ...defaultPhotoCrop } } : undefined);
    } catch (error) {
      URL.revokeObjectURL(nextUrl);
      if (!controller.signal.aborted) { setPhotoState('error'); setPhotoError(error instanceof Error ? error.message : 'The photo could not be uploaded.'); }
    } finally { if (photoUploadRequest.current === controller) photoUploadRequest.current = undefined; }
  }
  function startPhotoMove() {
    if (!photo || photoState === 'uploading') return;
    if (!photoAdjustment?.placement) {
      const paper = document.querySelector('.preview-shell .bio-paper')?.getBoundingClientRect();
      const frame = document.querySelector('[data-profile-photo]')?.getBoundingClientRect();
      if (!paper?.width || !paper.height || !frame?.width) return;
      const placement = boundPhotoPlacement({ x: (frame.left - paper.left) / paper.width * 100, y: (frame.top - paper.top) / paper.height * 100, width: frame.width / paper.width * 100 });
      setPhotoAdjustment(current => ({ crop: current?.crop || { ...defaultPhotoCrop }, placement }));
    }
    setPhotoMoveMode(true);
  }
  function openPhotoCrop() {
    setPhotoMoveMode(false);
    setPhotoCropDraft({ ...(photoAdjustment?.crop || defaultPhotoCrop) });
    const frame = document.querySelector('[data-profile-photo]');
    setPhotoCropRadius(frame ? getComputedStyle(frame).borderRadius : '50%'); setPhotoCropOpen(true);
  }
  async function saveProfile() {
    if (photoUploadRequest.current || artworkUploadState === 'uploading') return;
    setSaveError('');
    if (!name.trim()) {
      setSaveState('Add your name'); setSaveError('Add your full name before saving.'); nameInput.current?.focus();
      setTimeout(() => setSaveState('Save my biodata'), 2200); return;
    }
    setSaveState('Saving…');
    try {
      const completed = isCompleted || sameExceptPhotoAdjustment(completedSignature, currentCompletionSignature);
      await persistProfile({ completed, signature: completed ? currentCompletionSignature : '' });
      if (completed) setCompletedSignature(currentCompletionSignature);
      setAccountState('signed-in'); setSaveState('Saved ✓');
    } catch (error) { setSaveState('Try again'); setSaveError(error instanceof Error ? error.message : 'Your biodata could not be saved.'); }
    setTimeout(() => setSaveState('Save my biodata'), 2200);
  }
  async function persistProfile(input: { completed: boolean; signature: string; nextAbout?: string; nextFields?: ProfileField[]; nextCustomDesign?: TemplateDesign; nextFinishDesign?: TemplateDesign; nextFrameStyle?: FrameStyle; nextBackgroundStyle?: BackgroundStyle; nextColorPreset?: ColorPresetId; nextColors?: TemplateColors; nextArtwork?: UploadedArtwork }) {
    const response = await fetch('/api/biodata', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      name,
      introduction: input.nextAbout ?? about,
      template,
      photoKey,
      completed: input.completed,
      details: { profileFields: input.nextFields ?? profileFields, customDesign: input.nextCustomDesign ?? customDesign, finishDesign: input.nextFinishDesign ?? finishDesign, frameStyle: input.nextFrameStyle ?? frameStyle, backgroundStyle: input.nextBackgroundStyle ?? backgroundStyle, colorPreset: input.nextColorPreset ?? colorPreset, customColors: input.nextColors ?? customColors, completionSignature: input.signature, uploadedArtwork: input.nextArtwork ?? uploadedArtwork ?? null, photoAdjustment: photoAdjustment ?? null },
    }) });
    if (response.status === 401) { window.location.href = `/login?return_to=${encodeURIComponent(window.location.pathname + window.location.search)}`; throw new Error('Sign in to continue.'); }
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(data.error || 'Your biodata could not be saved.');
  }
  async function downloadCompletedBiodata() {
    setSaveError('');
    if (photoUploadRequest.current || artworkUploadState === 'uploading') { setSaveError('Wait for the image upload to finish before downloading.'); return; }
    if (accountState !== 'signed-in') { window.location.href = `/login?return_to=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
    if (!isCompleted) { setSaveError(photoChangesNeedSave ? 'Save your photo adjustments first. No new AI finishing is needed.' : 'Finish the biodata with AI and save the final result before downloading.'); document.getElementById(photoChangesNeedSave ? 'editor' : 'ai-finish')?.scrollIntoView({ behavior: 'smooth' }); return; }
    setDownloadState('checking');
    try {
      const response = await fetch('/api/download', { method: 'POST' });
      const data = await response.json().catch(() => ({})) as { allowed?: boolean; error?: string };
      if (!response.ok || !data.allowed) throw new Error(data.error || 'The download could not be started.');
      const paper = document.querySelector<HTMLElement>('.preview-shell .bio-paper');
      if (!paper) throw new Error('The biodata preview is not ready. Please retry.');
      await printBiodata(paper);
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'The download could not be started.'); }
    finally { setDownloadState('idle'); }
  }
  async function improveBio() {
    setAiState('loading'); setAiError('');
    try {
      const response = await fetch('/api/ai/improve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, introduction: about, tone: aiTone }) });
      const data = await readApiResponse<{ introduction?: string }>(response, 'AI could not rewrite this introduction.');
      if (!response.ok || !data.introduction) throw new Error(data.error || 'AI could not rewrite this introduction.');
      setAbout(data.introduction); setAiOpen(false); setAiState('idle');
    } catch (error) { setAiState('error'); setAiError(error instanceof Error ? error.message : 'Something went wrong.'); }
  }
  function updateField(id: string, patch: Partial<ProfileField>) {
    setProfileFields((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }
  function moveField(index: number, direction: -1 | 1) {
    setProfileFields((items) => {
      const section = items[index]?.section;
      const sameSectionIndexes = items.map((item, itemIndex) => item.section === section ? itemIndex : -1).filter((itemIndex) => itemIndex >= 0);
      const sectionPosition = sameSectionIndexes.indexOf(index);
      const target = sameSectionIndexes[sectionPosition + direction];
      if (target === undefined) return items;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function canMoveField(index: number, direction: -1 | 1) {
    const section = profileFields[index]?.section;
    const sameSectionIndexes = profileFields.map((item, itemIndex) => item.section === section ? itemIndex : -1).filter((itemIndex) => itemIndex >= 0);
    const sectionPosition = sameSectionIndexes.indexOf(index);
    return sameSectionIndexes[sectionPosition + direction] !== undefined;
  }
  function addField(section: FieldSection = 'personal') {
    setProfileFields((items) => [...items, { id: `field-${Date.now()}`, label: 'New detail', value: '', section }]);
  }
  async function generateFieldsWithAi() {
    setFieldBuilderState('loading'); setFieldBuilderError(''); setSuggestedFields([]);
    try {
      const response = await fetch('/api/ai/fields', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: fieldIdea }) });
      if (response.status === 401) { window.location.href = `/login?return_to=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
      const data = await response.json().catch(() => ({})) as { fields?: Array<{ label?: unknown; value?: unknown; section?: unknown }>; error?: string };
      if (!response.ok || !Array.isArray(data.fields)) throw new Error(data.error || 'AI could not create fields from those details.');
      const fields = data.fields.flatMap((field, index): ProfileField[] => {
        if (typeof field.label !== 'string' || typeof field.value !== 'string' || !['personal', 'family', 'contact', 'preferences'].includes(String(field.section))) return [];
        return [{ id: `ai-field-${Date.now()}-${index}`, label: field.label, value: field.value, section: field.section as FieldSection }];
      });
      if (!fields.length) throw new Error('AI could not find clear field-and-value pairs. Add a little more detail and try again.');
      setSuggestedFields(fields); setFieldBuilderState('idle');
    } catch (error) {
      setFieldBuilderState('error'); setFieldBuilderError(error instanceof Error ? error.message : 'AI could not create the fields.');
    }
  }
  function updateSuggestedField(id: string, patch: Partial<ProfileField>) {
    setSuggestedFields((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }
  function addSuggestedFieldsToTemplate() {
    const approved = suggestedFields.filter((field) => field.label.trim() && field.value.trim());
    if (!approved.length) { setFieldBuilderError('Keep at least one field with a name and value.'); return; }
    setProfileFields((items) => {
      const next = [...items];
      for (const field of approved) {
        const existingIndex = next.findIndex((item) => item.section === field.section && item.label.trim().toLocaleLowerCase() === field.label.trim().toLocaleLowerCase());
        if (existingIndex >= 0) next[existingIndex] = { ...next[existingIndex], label: field.label.trim(), value: field.value.trim() };
        else next.push({ ...field, id: `field-${crypto.randomUUID()}`, label: field.label.trim(), value: field.value.trim() });
      }
      return next;
    });
    setExtraOpen(true); setSuggestedFields([]); setFieldIdea(''); setFieldBuilderError(''); setFieldBuilderOpen(false);
    setTimeout(() => document.getElementById('extra-profile-fields')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }
  function selectTemplate(id: TemplateId) {
    setTemplate(id);
    if (!id.endsWith('-devotional')) setUploadedArtwork(current => current?.placement === 'replace-header' ? { ...current, placement: 'above-details' } : current);
    setFinishDesign(undefined);
    if (id !== 'ai-custom') setCustomDesign(undefined);
    const url = new URL(window.location.href);
    url.searchParams.set('template', id);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }
  async function handleDesignReference(file?: File) {
    if (!file) return;
    setDesignError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4_000_000) {
      setDesignReference(''); setDesignReferenceName('');
      setDesignError('Choose a JPG, PNG or WebP template image under 4 MB.');
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('The image could not be read.'));
        reader.onerror = () => reject(new Error('The image could not be read.'));
        reader.readAsDataURL(file);
      });
      setDesignReference(dataUrl); setDesignReferenceName(file.name);
    } catch (error) {
      setDesignReference(''); setDesignReferenceName('');
      setDesignError(error instanceof Error ? error.message : 'The image could not be read.');
    }
  }
  function goToTemplates() {
    window.location.assign('/');
  }
  function goToSection(id: 'editor' | 'ai-finish') {
    setMobileNav(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function toggleFinishChangeTarget(target: FinishChangeTarget) {
    setFinishChangeTargets((current) => current.includes(target) ? current.filter((item) => item !== target) : [...current, target]);
  }
  async function createAiDesign() {
    if (!designIdea.trim() && !designReference) return;
    setDesignState('loading'); setDesignError('');
    try {
      const response = await fetch('/api/ai/design', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idea: designIdea, referenceImage: designReference || undefined }) });
      const data = await readApiResponse<{ design?: TemplateDesign }>(response, 'AI could not create this design.');
      if (!response.ok || !data.design) throw new Error(data.error || 'AI could not create this design.');
      setUploadedArtwork(current => current?.placement === 'replace-header' ? { ...current, placement: 'above-details' } : current);
      setCustomDesign(data.design); setFinishDesign(undefined); setFrameStyle('template'); setBackgroundStyle('template'); setColorPreset('template'); setTemplate('ai-custom'); setDesignState('idle'); setDesignOpen(false); setDesignReference(''); setDesignReferenceName('');
      const url = new URL(window.location.href);
      url.searchParams.set('template', 'ai-custom');
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      sessionStorage.setItem('jeevanpatra-ai-design', JSON.stringify(data.design));
    } catch (error) { setDesignState('error'); setDesignError(error instanceof Error ? error.message : 'Something went wrong.'); }
  }
  async function uploadFinishingImage(file?: File) {
    if (!file) return;
    setArtworkUploadError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 5_000_000) {
      setArtworkUploadState('error'); setArtworkUploadError('Choose a JPG, PNG or WebP under 5 MB.'); return;
    }
    setArtworkUploadState('uploading');
    try {
      const form = new FormData(); form.append('photo', file); form.append('purpose', 'artwork');
      const response = await fetch('/api/photo', { method: 'POST', body: form });
      const data = await readApiResponse<{ url?: string }>(response, 'Your image could not be uploaded.');
      const next: UploadedArtwork = { src: data.url || '', placement: uploadedArtwork?.placement || (template.endsWith('-devotional') ? 'replace-header' : 'above-details'), size: uploadedArtwork?.size || 'medium' };
      if (!response.ok || !isUploadedArtwork(next)) throw new Error(data.error || 'Your image could not be uploaded. Sign in and try again.');
      setUploadedArtwork(next); setArtworkUploadState('idle');
    } catch (error) { setArtworkUploadState('error'); setArtworkUploadError(error instanceof Error ? error.message : 'Your image could not be uploaded.'); }
  }
  async function finishWithAi() {
    if (finishState === 'loading' || finishState === 'saving' || artworkUploadState === 'uploading') return;
    if (photoUploadRequest.current) { setFinishError('Wait for your profile photo to finish uploading, then try again.'); return; }
    finishRequest.current?.abort();
    const controller = new AbortController(); finishRequest.current = controller;
    const signature = currentCompletionSignature;
    setFinishState('loading'); setFinishError(''); setFinishReview(undefined);
    try {
      const fieldSummary = profileFields.map(({ id, label, section, group, value }) => ({ id, label, section, group, hasValue: Boolean(value.trim()) }));
      const theme = getTemplateById(template)?.theme;
      const activeDesign = template === 'ai-custom' ? customDesign : finishDesign;
      const currentColors = activeColorOverride || activeDesign || theme || defaultCustomColors;
      const response = await fetch('/api/ai/finalize', { method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, introduction: about, fields: fieldSummary, stylePreference, recommendation: styleRecommendation.trim(), changeTargets: finishChangeTargets, improvementMode: finishImprovementMode, currentTemplate: template, currentDesign: activeDesign, currentVisuals: { frameStyle, backgroundStyle, colors: { primary: currentColors.primary, accent: currentColors.accent, paper: currentColors.paper, text: currentColors.text }, ...(uploadedArtwork ? { uploadedArtwork: { placement: uploadedArtwork.placement, size: uploadedArtwork.size } } : {}) } }) });
      const data = await readApiResponse<FinishResult>(response, 'AI could not prepare these changes.');
      if (finishRequest.current !== controller || controller.signal.aborted) return;
      if (latestFinishSignature.current !== signature) throw new Error('Your biodata changed while AI was working. Generate a fresh plan; nothing was applied.');
      if (!response.ok || typeof data.introduction !== 'string' || !Array.isArray(data.fieldOrder) || !isTemplateDesign(data.design) || !Array.isArray(data.changes) || !data.visuals) throw new Error(data.error || 'AI could not prepare verified changes. Nothing was applied.');
      setFinishReview({ result: data, signature, requestKey: finishRequestKey }); setFinishState('idle');
    } catch (error) { if (!controller.signal.aborted && finishRequest.current === controller) { setFinishState('error'); setFinishError(error instanceof Error ? error.message : 'Nothing was changed. Please retry.'); } }
  }
  function closeFinishing() {
    if (finishState === 'saving') return;
    finishRequest.current?.abort(); finishRequest.current = undefined;
    setFinishOpen(false); setFinishReview(undefined); setFinishState('idle'); setFinishError('');
  }
  async function applyReviewedFinish() {
    if (!currentFinishReview || finishState === 'saving') return;
    setFinishState('saving'); setFinishError('');
    try {
      const data = currentFinishReview.result;
      const fieldById = new Map(profileFields.map((field) => [field.id, field]));
      const reordered = data.fieldOrder.map((id) => fieldById.get(id)).filter((field): field is ProfileField => Boolean(field));
      const untouched = profileFields.filter((field) => !data.fieldOrder!.includes(field.id));
      const nextFields = [...reordered, ...untouched].map(field => {
        const update = data.fieldUpdates?.find(item => item.id === field.id);
        return update ? { ...field, ...update, value: field.value } : field;
      });
      const nextCustomDesign = template === 'ai-custom' ? data.design : customDesign;
      const nextFinishDesign = template === 'ai-custom' ? undefined : data.design;
      const nextFrameStyle = data.visuals.frameStyle;
      const nextBackgroundStyle = data.visuals.backgroundStyle;
      const colorsChanged = data.changes.some(change => /^design\.(primary|accent|paper|text):/.test(change.target));
      // Keep original gradient paper when only a heading/text colour changes.
      const updateManualPalette = colorsChanged && colorPreset !== 'template';
      const nextColorPreset = updateManualPalette ? 'custom' as const : colorPreset;
      const nextColors = updateManualPalette ? data.visuals.colors : customColors;
      const nextArtwork = uploadedArtwork && data.visuals.uploadedArtwork ? { ...uploadedArtwork, ...data.visuals.uploadedArtwork } : uploadedArtwork;
      const signature = completionSignature({ name, about: data.introduction, profileFields: nextFields, template, customDesign: nextCustomDesign, finishDesign: nextFinishDesign, frameStyle: nextFrameStyle, backgroundStyle: nextBackgroundStyle, colorPreset: nextColorPreset, customColors: nextColors, uploadedArtwork: nextArtwork, photoAdjustment });
      // Save successfully before committing any of the AI edits to the editor.
      await persistProfile({ completed: true, signature, nextAbout: data.introduction, nextFields, nextCustomDesign, nextFinishDesign, nextFrameStyle, nextBackgroundStyle, nextColorPreset, nextColors, nextArtwork });
      setAbout(data.introduction); setProfileFields(nextFields);
      setFrameStyle(nextFrameStyle); setBackgroundStyle(nextBackgroundStyle); setColorPreset(nextColorPreset); setCustomColors(nextColors); setUploadedArtwork(nextArtwork);
      if (template === 'ai-custom') {
        setCustomDesign(data.design);
        setFinishDesign(undefined);
        sessionStorage.setItem('jeevanpatra-ai-design', JSON.stringify(data.design));
      } else {
        setFinishDesign(data.design);
      }
      setCompletedSignature(signature); setSaveState('Completed & saved ✓');
      setLastFinishChanges(data.changes.map(change => change.label)); setFinishReview(undefined); setFinishState('idle'); setFinishOpen(false);
      document.querySelector('.preview-shell')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) { setFinishState('error'); setFinishError(error instanceof Error ? error.message : 'The changes could not be saved. Your biodata is unchanged.'); }
  }

  if (!draftReady) return <main className="grid min-h-screen place-items-center bg-[var(--cream)] px-6 text-[var(--ink)]" aria-busy="true"><output className="block text-center"><span className="logo-mark mx-auto">ज</span><h1 className="mt-5 font-serif text-3xl">Preparing your selected design…</h1><p className="mt-2 text-sm text-[var(--muted)]">Restoring your details and template.</p></output></main>;

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <header className="sticky top-0 z-40 border-b border-[#2f493f18] bg-[#fbf8f0e8] backdrop-blur-xl print:hidden">
        <div className="mx-auto flex h-[74px] max-w-[1480px] items-center justify-between px-5 lg:px-9">
          <Link className="flex items-center gap-3" href="/" aria-label="JeevanPatra templates"><span className="logo-mark">ज</span><span><strong className="font-serif text-[20px]">JeevanPatra</strong><small className="block text-[9px] font-bold uppercase tracking-[.19em] text-[var(--muted)]">Biodata studio</small></span></Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold lg:flex" aria-label="Creation steps"><button type="button" className="nav-link" onClick={goToTemplates}>← Templates</button><button type="button" className="nav-link" onClick={() => goToSection('editor')}>Your details</button><button type="button" className="nav-link" onClick={() => goToSection('ai-finish')}>AI finishing</button></nav>
          <div className="hidden items-center gap-3 lg:flex">{accountState === 'signed-in' ? accountRole === 'admin' ? <button type="button" className="rounded-full px-4 py-2.5 text-sm font-bold text-[var(--teal)]" onClick={() => window.location.assign('/admin')}><Check size={15} className="inline" /> Admin controls</button> : <span className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-[var(--teal)]"><Check size={15} /> Customer</span> : accountState === 'checking' ? <span className="px-4 py-2.5 text-sm text-[var(--muted)]">Checking account…</span> : <button type="button" className="rounded-full px-4 py-2.5 text-sm font-bold" onClick={() => window.location.assign(`/login?return_to=${encodeURIComponent(`/create?template=${template}`)}`)}>Sign in / Sign up</button>}<button className="primary-button" onClick={() => setFinishOpen(true)}>Finish with AI <Sparkles size={16} /></button></div>
          <button className="p-2 lg:hidden" onClick={() => setMobileNav(!mobileNav)} aria-label={mobileNav ? 'Close menu' : 'Open menu'} aria-expanded={mobileNav} aria-controls="mobile-navigation">{mobileNav ? <X /> : <Menu />}</button>
        </div>
        {mobileNav && <nav id="mobile-navigation" className="border-t bg-[#fbf8f0] px-5 py-4 lg:hidden" aria-label="Mobile navigation"><button type="button" className="block w-full py-2 text-left font-semibold" onClick={goToTemplates}>← Change template</button><button type="button" className="block w-full py-2 text-left font-semibold" onClick={() => goToSection('editor')}>Your details</button><button type="button" className="block w-full py-2 text-left font-semibold" onClick={() => goToSection('ai-finish')}>AI finishing</button>{accountState === 'signed-in' ? accountRole === 'admin' ? <button type="button" className="block w-full py-2 text-left font-semibold text-[var(--teal)]" onClick={() => window.location.assign('/admin')}>Admin controls</button> : <span className="flex items-center gap-1.5 py-2 font-semibold text-[var(--teal)]"><Check size={15} /> Customer account</span> : accountState === 'checking' ? <span className="block py-2 text-[var(--muted)]">Checking account…</span> : <button type="button" className="block w-full py-2 text-left font-semibold" onClick={() => window.location.assign(`/login?return_to=${encodeURIComponent(`/create?template=${template}`)}`)}>Sign in / Sign up</button>}<button className="primary-button mt-3" onClick={() => { setMobileNav(false); setFinishOpen(true); }}>Finish with AI</button></nav>}
      </header>

      <section className="builder-heading print:hidden"><div><button type="button" onClick={goToTemplates}>Step 1 · Template selected</button><button type="button" onClick={() => goToSection('editor')}>Step 2 · Add every detail you want</button><button type="button" onClick={() => goToSection('ai-finish')}>Step 3 · Let AI finish the typography and style</button></div><h1>Now tell your story.</h1><p>Add, rename, remove or reorder any field. Your selected template stays with you while you work.</p></section>

      <section id="editor" className="border-y border-[#29483f17] bg-[#f2ede2] px-4 py-14 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><span className="eyebrow"><Sparkles size={14} /> Live studio</span><h2 className="mt-4 font-serif text-4xl lg:text-5xl">Make it yours.</h2><p className="mt-2 text-[var(--muted)]">Edit the details and watch your biodata come to life.</p></div><div className="print:hidden"><div className="flex flex-wrap justify-end gap-2"><button className="soft-button" onClick={() => void downloadCompletedBiodata()} disabled={downloadState === 'checking'}>{downloadState === 'checking' ? 'Checking…' : isCompleted ? 'Download PDF' : photoChangesNeedSave ? 'Save photo changes first' : 'Download after finishing'}</button><button className="primary-button" onClick={() => void saveProfile()} disabled={saveState === 'Saving…' || photoState === 'uploading' || artworkUploadState === 'uploading'}>{saveState}</button><span className="sr-only" aria-live="polite">{saveState}</span></div><p className={`completion-note ${isCompleted ? 'ready' : ''}`}>{isCompleted ? 'Completed and ready to download.' : photoChangesNeedSave ? 'Save your photo adjustments to download. No new AI finishing is needed.' : 'Complete AI finishing before download is enabled.'}</p>{saveError && <p className="mt-2 max-w-[380px] text-right text-xs font-bold text-[#9d3030]" role="alert">{saveError}</p>}</div></div>
          <div className="studio-grid grid gap-5 xl:grid-cols-[320px_minmax(500px,1fr)_280px]">
            <aside className="editor-panel print:hidden">
              <div className="panel-title"><span>01</span> Your details</div>
              <label className="field-label">Full name<input ref={nameInput} value={name} onChange={(e) => { setName(e.target.value); if (saveError) setSaveError(''); }} /></label>
              <label className="field-label">A little about you<textarea rows={5} value={about} onChange={(e) => setAbout(e.target.value)} /></label><button className="ai-button" onClick={() => setAiOpen(true)}><WandSparkles size={17} /> Improve with AI</button>
              <button className="section-toggle" aria-expanded={extraOpen} aria-controls="extra-profile-fields" onClick={() => setExtraOpen(!extraOpen)}><span><span className="section-count">03</span> Add, rename or replace fields</span><ChevronDown className={extraOpen ? 'rotate-180' : ''} size={17} /></button>
              {extraOpen && <div className="extra-fields" id="extra-profile-fields">
                <p className="field-help">Change any label or value, choose its section, reorder it, or remove it. The preview updates instantly.</p>
                {profileFields.map((field, index) => <div className="field-editor" key={field.id}>
                  <div className="field-editor-inputs"><input aria-label={`Rename ${field.label || 'unnamed'} field`} value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} /><input aria-label={`${field.label || 'Field'} value`} value={field.value} placeholder="Enter value" onChange={(e) => updateField(field.id, { value: e.target.value })} /></div>
                  <select aria-label={`${field.label.trim() || 'Unnamed field'} section`} value={field.section} onChange={(e) => updateField(field.id, { section: e.target.value as FieldSection })}><option value="personal">Personal</option><option value="family">Family</option><option value="preferences">Partner preferences</option><option value="contact">Contact</option></select>
                  <div className="field-editor-actions"><button disabled={!canMoveField(index, -1)} onClick={() => moveField(index, -1)} aria-label={`Move ${field.label.trim() || 'unnamed field'} up`}><ArrowUp size={13} /></button><button disabled={!canMoveField(index, 1)} onClick={() => moveField(index, 1)} aria-label={`Move ${field.label.trim() || 'unnamed field'} down`}><ArrowDown size={13} /></button><button className="danger" onClick={() => setProfileFields((items) => items.filter((item) => item.id !== field.id))} aria-label={`Remove ${field.label.trim() || 'unnamed field'}`}><Trash2 size={13} /></button></div>
                </div>)}
                <button className="add-detail-button" onClick={() => addField()}><Plus size={15} /> Add another field</button>
              </div>}
              <div className="mt-7 border-t border-[#29483f15] pt-6"><div className="panel-title"><span>02</span> Your profile photo</div>
                <p className="mb-3 text-xs leading-5 text-[var(--muted)]">Add your own photo here. Adjust its crop or move the photo frame on your biodata.</p>
                <input ref={fileInput} aria-label="Upload profile photo" type="file" accept="image/jpeg,image/png" className="hidden" onChange={event => { void handlePhoto(event.target.files?.[0]); event.target.value = ''; }} />
                <section aria-label="Drop profile photo here" className={`profile-photo-drop ${photoDropActive ? 'drag-active' : ''}`}>
                  <button type="button" className="upload-box" disabled={photoState === 'uploading'} onClick={() => fileInput.current?.click()} onDragOver={event => { event.preventDefault(); if (photoState !== 'uploading') setPhotoDropActive(true); }} onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setPhotoDropActive(false); }} onDrop={event => { event.preventDefault(); setPhotoDropActive(false); if (event.dataTransfer.files.length > 1) { setPhotoError('Choose one profile photo at a time.'); return; } void handlePhoto(event.dataTransfer.files[0]); }}><Upload size={22} /><strong>{photoState === 'uploading' ? 'Uploading photo…' : photo ? 'Replace your photo' : 'Upload your photo'}</strong><small>Or drag and drop here · JPG or PNG · Max 5 MB</small></button>
                </section>
                {photo && <div className="photo-actions"><button type="button" className="soft-button" disabled={photoState === 'uploading'} onClick={openPhotoCrop}>Adjust photo crop</button><button type="button" className="soft-button" disabled={photoState === 'uploading'} onClick={startPhotoMove}>Move photo on biodata</button>{photoAdjustment && <button type="button" className="photo-reset" onClick={() => { setPhotoAdjustment(undefined); setPhotoMoveMode(false); }}>Reset all photo adjustments</button>}<p>Save your biodata to keep photo adjustments for your next login and PDF.</p></div>}
                {photoError && <p className="ai-error" role="alert">{photoError}</p>}<span className="sr-only" aria-live="polite">{photoState === 'saved' ? 'Photo uploaded successfully.' : ''}</span>
              </div>
            </aside>
            <section className="preview-shell"><div className="preview-toolbar print:hidden"><span className="flex items-center gap-2 text-sm font-bold"><span className="live-dot" /> Live preview</span><span className="text-xs text-[var(--muted)]">{active.name} · A4</span></div>
              {photoMoveMode && photoAdjustment?.placement && <section className="photo-position-toolbar print:hidden" aria-label="Profile photo position controls"><strong>Drag your photo to position it</strong><p>Drag with your mouse or finger. Arrow keys move the selected photo; Shift moves faster. Keep it clear of your details.</p>
                <label htmlFor="profile-frame-size">Photo size on biodata <output>{Math.round(photoAdjustment.placement.width)}%</output><input id="profile-frame-size" type="range" min="10" max="45" step="0.1" value={photoAdjustment.placement.width} onChange={event => { const width = Number(event.target.value); setPhotoAdjustment(current => current?.placement ? { ...current, placement: resizePhoto(current.placement, width) } : current); }} /></label>
                <label>Photo left / right<input type="range" min="0" max={100 - photoAdjustment.placement.width} step="0.1" value={photoAdjustment.placement.x} onChange={event => { const x = Number(event.target.value); setPhotoAdjustment(current => current?.placement ? { ...current, placement: boundPhotoPlacement({ ...current.placement, x }) } : current); }} /></label>
                <label>Photo up / down<input type="range" min="0" max={100 - photoAdjustment.placement.width * 210 / 297} step="0.1" value={photoAdjustment.placement.y} onChange={event => { const y = Number(event.target.value); setPhotoAdjustment(current => current?.placement ? { ...current, placement: boundPhotoPlacement({ ...current.placement, y }) } : current); }} /></label>
                <div className="flex flex-wrap gap-2"><button type="button" className="primary-button" onClick={() => setPhotoMoveMode(false)}>Done positioning</button><button type="button" className="soft-button" onClick={() => { setPhotoAdjustment(current => current ? { crop: current.crop } : undefined); setPhotoMoveMode(false); }}>Reset photo position</button></div>
              </section>}
              <BiodataPaper template={template} photo={photo} name={name} about={about} fields={profileFields} design={template === 'ai-custom' ? customDesign : finishDesign} uploadedArtwork={uploadedArtwork} photoAdjustment={photoAdjustment} onPhotoPlacementChange={photoMoveMode ? placement => setPhotoAdjustment(current => ({ crop: current?.crop || { ...defaultPhotoCrop }, placement })) : undefined} onPhotoMoveEnd={() => setPhotoMoveMode(false)} frameStyle={frameStyle} backgroundStyle={backgroundStyle} colorOverride={activeColorOverride} />
            </section>
            <aside className="editor-panel print:hidden" id="templates">
              <div className="panel-title"><span>03</span> Choose a style</div>
              <div className="space-y-3">{quickTemplates.map((item) => <button key={item.id} aria-pressed={template === item.id} onClick={() => selectTemplate(item.id)} className={`template-option ${template === item.id ? 'active' : ''}`}><span className={`mini-paper ${item.id}`} style={templatePreviewStyle(item.id, customDesign)}><i /><b /></span><span className="text-left"><strong>{item.name}</strong><small>{item.note}</small></span>{template === item.id && <Check className="ml-auto" size={18} />}</button>)}</div>
              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#34594c4a] py-3 text-sm font-bold text-[var(--teal)]" onClick={() => setTemplatesOpen(true)}><Plus size={16} /> View all templates</button>
              <div className="frame-style-section">
                <div className="panel-title"><span>04</span> Border shape</div>
                <p className="frame-style-help">Change only the frame. Your selected colors, fonts and template stay the same.</p>
                <fieldset className="frame-style-grid">
                  <legend className="sr-only">Choose the biodata border shape</legend>
                  {frameStyleOptions.map((option) => <button type="button" key={option.id} className={`frame-style-option ${frameStyle === option.id ? 'active' : ''}`} aria-pressed={frameStyle === option.id} title={option.note} onClick={() => setFrameStyle(option.id)}><span className={`frame-style-icon ${option.id}`} aria-hidden="true" /><span>{option.label}</span>{frameStyle === option.id && <Check size={13} />}</button>)}
                </fieldset>
              </div>
              <div className="customization-section">
                <div className="panel-title"><span>05</span> Background print</div>
                <p className="frame-style-help">Change only the paper pattern. The template, border and details stay in place.</p>
                <fieldset className="background-style-grid">
                  <legend className="sr-only">Choose the template background print</legend>
                  {backgroundStyleOptions.map((option) => <button type="button" key={option.id} className={`background-style-option ${backgroundStyle === option.id ? 'active' : ''}`} aria-pressed={backgroundStyle === option.id} title={option.note} onClick={() => setBackgroundStyle(option.id)}><span className={`background-style-swatch ${option.id}`} aria-hidden="true" /><span>{option.label}</span>{backgroundStyle === option.id && <Check size={12} />}</button>)}
                </fieldset>
              </div>
              <div className="customization-section">
                <div className="panel-title"><span>06</span> Colour palette</div>
                <p className="frame-style-help">Apply a colour set without changing your chosen design or background print.</p>
                <fieldset className="color-preset-grid">
                  <legend className="sr-only">Choose the template colour palette</legend>
                  {colorPresets.map((option) => <button type="button" key={option.id} className={`color-preset-option ${colorPreset === option.id ? 'active' : ''}`} aria-pressed={colorPreset === option.id} onClick={() => setColorPreset(option.id)}><span className={`color-preset-swatch ${option.id}`} style={option.colors ? { '--swatch-paper': option.colors.paper, '--swatch-primary': option.colors.primary, '--swatch-accent': option.colors.accent, '--swatch-text': option.colors.text } as CSSProperties : undefined} aria-hidden="true" /><span>{option.label}</span>{colorPreset === option.id && <Check size={12} />}</button>)}
                </fieldset>
                {colorPreset === 'custom' && <div className="custom-color-grid" aria-label="Custom template colours">
                  {([['paper', 'Paper'], ['primary', 'Border'], ['accent', 'Accent'], ['text', 'Text']] as const).map(([key, label]) => <label key={key}><span>{label}</span><span className="color-input-wrap"><input type="color" value={customColors[key]} aria-label={`${label} colour`} onChange={(event) => setCustomColors((colors) => ({ ...colors, [key]: event.target.value }))} /><output>{customColors[key].toUpperCase()}</output></span></label>)}
                </div>}
              </div>
              <button className="ai-template-button" onClick={() => setDesignOpen(true)}><WandSparkles size={18} /><span><strong>Create with AI</strong><small>Describe colors, border shape and layout</small></span></button>
              <div className="mt-6 rounded-2xl bg-[#e5eee9] p-5"><Sparkles className="text-[var(--teal)]" size={22} /><h3 className="mt-3 font-serif text-xl">Need a little help?</h3><p className="mt-2 text-xs leading-5 text-[var(--muted)]">AI can refine your introduction or create a custom template.</p></div>
            </aside>
          </div>
          <div className="ai-field-builder-card print:hidden"><div><span className="finish-number">07</span><div><p className="eyebrow"><ListPlus size={14} /> AI field builder</p><h2>Turn your sentences into editable fields.</h2><p>Paste partner preferences or any other details. AI will separate them into field names and values for you to review before anything is added to the template.</p></div></div><button className="soft-button" onClick={() => { setFieldBuilderError(''); setFieldBuilderOpen(true); }}>Create fields with AI <Sparkles size={17} /></button></div>
          <div id="ai-finish" className="ai-finish-card print:hidden"><div><span className="finish-number">08</span><div><p className="eyebrow"><Sparkles size={14} /> Final step</p><h2>Let AI finish the complete biodata.</h2><p>Describe your changes, review the exact edits, then save. Your other settings and personal facts stay protected.</p>{lastFinishChanges.length > 0 && <output className="mt-2 block text-xs">Saved changes: {lastFinishChanges.join(', ')}.</output>}</div></div><button className="primary-button" onClick={() => setFinishOpen(true)}>Finish my biodata <WandSparkles size={17} /></button></div>
        </div>
      </section>

      <footer id="languages" className="border-t border-[#29483f18] px-5 py-8 text-sm text-[var(--muted)]"><div className="mx-auto flex max-w-[1320px] flex-wrap items-start justify-between gap-4"><span className="flex items-center gap-2 font-serif text-lg font-bold text-[var(--ink)]"><span className="logo-mark small">ज</span> JeevanPatra</span><p>Your saved biodata is private to your account. AI receives only the information needed for the edit you request.</p><div className="footer-help"><details><summary>Privacy</summary><p>Your profile is account-private. AI finishing receives your introduction and field labels. The AI field builder receives only the text you paste into it.</p></details><details><summary>Help</summary><p>Choose a template, add any fields you need, preview the result, then download PDF or save after signing in.</p></details><details><summary>Languages</summary><p>You can write labels and values in English, हिंदी, मराठी, or another language.</p></details></div></div></footer>

      {photoCropOpen && <Modal label="Adjust profile photo crop" onClose={() => setPhotoCropOpen(false)}><h2 className="font-serif text-3xl">Frame your photo</h2><p className="mt-2 text-sm text-[var(--muted)]">Adjust only your profile picture. Your background and other design elements stay in place.</p><PhotoCropEditor src={photo} crop={photoCropDraft} radius={photoCropRadius} onChange={setPhotoCropDraft} /><div className="mt-5 flex flex-wrap gap-2"><button type="button" className="primary-button" onClick={() => { setPhotoAdjustment(current => ({ ...current, crop: photoCropDraft })); setPhotoCropOpen(false); }}>Apply photo crop</button><button type="button" className="soft-button" onClick={() => setPhotoCropOpen(false)}>Cancel crop</button></div></Modal>}
      {aiOpen && <Modal label="Improve your introduction with Groq AI" onClose={() => setAiOpen(false)}><div className="modal-icon"><WandSparkles /></div><p className="eyebrow mx-auto w-fit">Powered by Groq AI</p><h2 className="mt-4 text-center font-serif text-3xl">Find the words that feel like you.</h2><p className="mt-3 text-center text-sm leading-6 text-[var(--muted)]">We’ll keep your meaning, match your chosen tone, and never invent personal facts.</p><div className="mt-6 rounded-2xl bg-[#f5f0e6] p-4 text-sm leading-6 text-[var(--muted)]">“{about}”</div><fieldset className="mt-5 grid grid-cols-3 gap-2 border-0 p-0 text-xs font-bold"><legend className="sr-only">Writing tone</legend>{(['warm', 'concise', 'traditional'] as AiTone[]).map((tone) => <button key={tone} type="button" aria-pressed={aiTone === tone} className={`tone ${aiTone === tone ? 'active' : ''}`} onClick={() => setAiTone(tone)}>{tone[0].toUpperCase() + tone.slice(1)}</button>)}</fieldset>{aiError && <p className="ai-error" role="alert">{aiError}</p>}<button className="primary-button mt-6 w-full justify-center py-3.5" onClick={improveBio} disabled={aiState === 'loading'}><Sparkles size={17} /> {aiState === 'loading' ? 'Writing with Groq…' : `Rewrite · ${aiTone[0].toUpperCase() + aiTone.slice(1)}`}</button></Modal>}
      {fieldBuilderOpen && <Modal label="Create editable fields with Groq AI" onClose={() => setFieldBuilderOpen(false)} wide>
        <div className="modal-icon"><ListPlus /></div>
        <p className="eyebrow mx-auto w-fit">AI field builder</p>
        <h2 className="mt-4 text-center font-serif text-3xl">Write naturally. Review every field.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-[var(--muted)]">Paste sentences, a list, or a table. AI will suggest field names and values, but nothing enters your template until you approve it.</p>
        <label className="field-label mt-6">Details to organize<textarea rows={7} maxLength={4000} value={fieldIdea} onChange={(event) => setFieldIdea(event.target.value)} placeholder={'Example:\nAge Range: 26–32\nHeight: 5 ft 4 in or above\nEducation: Graduate or Postgraduate\nProfession: Working or no preference\nLocation: Delhi NCR or anywhere\nFamily Values: Family-oriented\nLifestyle: Compatible and understanding\nOther Preferences: Mutual respect, honesty and emotional maturity'} /></label>
        <div className="ai-field-builder-actions"><small>{fieldIdea.length.toLocaleString()} / 4,000</small><button type="button" className="soft-button" onClick={() => void generateFieldsWithAi()} disabled={fieldBuilderState === 'loading' || !fieldIdea.trim()}><Sparkles size={16} /> {fieldBuilderState === 'loading' ? 'Creating fields…' : suggestedFields.length ? 'Generate again' : 'Create suggested fields'}</button></div>
        {fieldBuilderError && <p className="ai-error" role="alert">{fieldBuilderError}</p>}
        {suggestedFields.length > 0 && <section className="ai-field-review" aria-label="Review AI suggested fields"><div className="ai-field-review-heading"><div><strong>Review before adding</strong><span>{suggestedFields.length} suggested {suggestedFields.length === 1 ? 'field' : 'fields'}</span></div><small>Rename, edit, move to another section, or remove any suggestion.</small></div>{suggestedFields.map((field) => <div className="ai-field-review-row" key={field.id}><input aria-label={`${field.label} suggested field name`} value={field.label} onChange={(event) => updateSuggestedField(field.id, { label: event.target.value })} /><input aria-label={`${field.label} suggested value`} value={field.value} onChange={(event) => updateSuggestedField(field.id, { value: event.target.value })} /><select aria-label={`${field.label} suggested section`} value={field.section} onChange={(event) => updateSuggestedField(field.id, { section: event.target.value as FieldSection })}><option value="personal">Personal</option><option value="family">Family</option><option value="preferences">Partner preferences</option><option value="contact">Contact</option></select><button type="button" aria-label={`Remove ${field.label} suggestion`} onClick={() => setSuggestedFields((items) => items.filter((item) => item.id !== field.id))}><Trash2 size={15} /></button></div>)}<button type="button" className="primary-button mt-5 w-full justify-center py-3.5" onClick={addSuggestedFieldsToTemplate}><Check size={17} /> Add reviewed fields to template</button></section>}
        <p className="privacy-note">Only the text entered in this box is sent to Groq for this request. Review the result carefully before adding it.</p>
      </Modal>}
      {templatesOpen && <Modal label="Template library" onClose={() => setTemplatesOpen(false)} wide><p className="eyebrow w-fit"><LayoutTemplate size={14} /> Template library</p><h2 className="mt-4 font-serif text-3xl">A design for every family.</h2><div className="template-library-grid mt-6 grid gap-4 sm:grid-cols-3">{availableTemplates.map((item) => <button key={item.id} aria-pressed={template === item.id} className={`library-card ${item.id}`} onClick={() => { selectTemplate(item.id); setTemplatesOpen(false); }}><span className="library-paper" style={templatePreviewStyle(item.id, customDesign)}><i /><b /><em /></span><strong>{item.name}</strong><small>{item.note}</small></button>)}</div></Modal>}
      {designOpen && <Modal label="AI template designer" onClose={() => setDesignOpen(false)}>
        <div className="modal-icon"><Palette /></div>
        <p className="eyebrow mx-auto w-fit">AI template designer</p>
        <h2 className="mt-4 text-center font-serif text-3xl">Describe it or show an example.</h2>
        <p className="mt-3 text-center text-sm leading-6 text-[var(--muted)]">Upload a template reference and Groq Vision will study its colors, border, ornaments and layout to create a similar editable design.</p>
        <input ref={designReferenceInput} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { void handleDesignReference(event.target.files?.[0]); event.target.value = ''; }} />
        {designReference ? <div className="reference-preview"><div className="reference-preview-image"><Image src={designReference} alt="Uploaded template reference" fill unoptimized sizes="180px" /></div><div><strong>Reference ready</strong><span>{designReferenceName}</span><small>AI will copy the visual direction, not personal text or photos.</small></div><button type="button" onClick={() => { setDesignReference(''); setDesignReferenceName(''); }} aria-label="Remove template reference"><X size={16} /></button></div> : <button type="button" className="reference-upload" onClick={() => designReferenceInput.current?.click()}><Upload size={21} /><span><strong>Upload a template example</strong><small>JPG, PNG or WebP · Maximum 4 MB</small></span></button>}
        <div className="reference-divider"><span>and optionally describe changes</span></div>
        <label className="field-label">Your design idea<textarea rows={4} value={designIdea} onChange={(e) => setDesignIdea(e.target.value)} placeholder="Example: Keep this oval border and gold details, but use deep green with a modern font…" /></label>
        <p className="privacy-note">The reference image is sent to Groq only for this design request. It is not saved with your biodata.</p>
        {designError && <p className="ai-error" role="alert">{designError}</p>}
        <button className="primary-button mt-6 w-full justify-center py-3.5" onClick={createAiDesign} disabled={designState === 'loading' || (!designIdea.trim() && !designReference)}><WandSparkles size={17} /> {designState === 'loading' ? 'Studying and designing…' : designReference ? 'Create from this reference' : 'Create my template'}</button>
      </Modal>}
      {finishOpen && <Modal label="AI finishing studio" onClose={closeFinishing} busy={finishState === 'saving'} wide>
        <div className="modal-icon"><Sparkles /></div>
        <p className="eyebrow mx-auto w-fit">AI finishing studio</p>
        <h2 className="mt-4 text-center font-serif text-3xl">What should AI improve?</h2>
        <p className="mt-3 text-center text-sm leading-6 text-[var(--muted)]">Describe exactly what to change. Review the proposed edits before saving; everything else stays as it is.</p>
        <p className="mt-2 text-center text-xs leading-5 text-[var(--muted)]">Change text, fonts, colours, spacing, editable borders, field labels and grouping, or your uploaded image size and placement. Illustrated artwork has fixed parts; AI will explain when a request needs another template or an uploaded image.</p>
        <fieldset disabled={finishState === 'loading' || finishState === 'saving'} className="m-0 border-0 p-0">
        <div className="finish-studio-grid mt-6">
          <div>
            <label className="field-label mt-0">Overall style<select value={stylePreference} onChange={(event) => setStylePreference(event.target.value)}><option>Traditional</option><option>Old Style</option><option>Modern</option><option>Contemporary</option><option>Minimal</option><option>Royal</option><option>Custom</option></select></label>
            <fieldset className="finish-change-fieldset">
              <legend>What do you want to change specifically?</legend>
              <div className="finish-change-grid">
                {finishChangeOptions.map((option) => {
                  const selected = finishChangeTargets.includes(option.id);
                  return <button key={option.id} type="button" className={`finish-change-option ${selected ? 'active' : ''}`} aria-pressed={selected} onClick={() => toggleFinishChangeTarget(option.id)}>
                    <span>{option.label}</span><small>{option.note}</small>{selected && <Check size={15} />}
                  </button>;
                })}
              </div>
            </fieldset>
          </div>
          <div>
            <fieldset className="finish-improvement-fieldset">
              <legend>How freely should AI improve it?</legend>
              <div className="finish-improvement-options">
                {finishImprovementOptions.map((option) => <label key={option.id} aria-label={`${option.label}: ${option.note}`} className={finishImprovementMode === option.id ? 'active' : ''}>
                  <input type="radio" name="finish-improvement-mode" value={option.id} checked={finishImprovementMode === option.id} onChange={() => setFinishImprovementMode(option.id)} />
                  <span><strong>{option.label}</strong><small>{option.note}</small></span>
                </label>)}
              </div>
            </fieldset>
            <label className="field-label">Describe the exact change<textarea rows={5} maxLength={1200} value={styleRecommendation} onChange={(event) => setStyleRecommendation(event.target.value)} placeholder={'Example: Replace “ॐ नमः शिवाय” with “Jai Shri RadhaKrishna”. Keep the images, colours, fonts and fields unchanged.'} /></label>
            {template === 'mahadev-parvati-devotional' && <div className="mt-3 text-xs leading-5 text-[var(--muted)]"><p>Devotional artwork: original Mahadev–Parvati, add Radha Krishna opposite them, or replace only the divine couple.</p><button type="button" className="soft-button mt-2" onClick={() => setStyleRecommendation('Add a Radha Krishna image opposite Mahadev and Mata Parvati. Keep both divine images balanced, elegant and devotional. Preserve my photo, name and details. Keep the current colours and fonts.')}>Add Radha Krishna opposite Mahadev</button><button type="button" className="soft-button mt-2" onClick={() => { setFinishImprovementMode('requested-only'); setStyleRecommendation('Only replace the Mahadev and Parvati image with Radha Krishna. Maintain the same image position, size and decorative feel. Do not change any other section, text, theme, colours or layout.'); }}>Replace Mahadev–Parvati with Radha Krishna</button><button type="button" className="mt-2 block underline" onClick={() => setStyleRecommendation('Remove Radha Krishna and keep the original Mahadev and Mata Parvati artwork. Keep my other design settings.')}>Use original artwork</button></div>}
          </div>
        </div>
        <section className="mt-6 rounded-2xl border border-[#29483f26] bg-[#faf8f2] p-4" aria-label="Add your own image">
          <h3 className="font-serif text-xl">Add your own image</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Upload artwork or a devotional photo to include in your biodata. Your profile portrait stays separate.</p>
          <input ref={artworkInput} aria-label="Upload artwork image" className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { void uploadFinishingImage(event.target.files?.[0]); event.target.value = ''; }} />
          <button type="button" className="soft-button mt-3" disabled={artworkUploadState === 'uploading' || finishState === 'loading'} onClick={() => artworkInput.current?.click()}><Upload size={16} />{artworkUploadState === 'uploading' ? 'Uploading image…' : uploadedArtwork ? 'Replace uploaded image' : 'Upload image'}</button>
          <small className="ml-3 text-[var(--muted)]">JPG, PNG or WebP · Up to 5 MB</small>
          {uploadedArtwork && <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
            <Image src={uploadedArtwork.src} alt="Artwork to add" width={160} height={120} unoptimized className="h-[120px] w-[160px] rounded-lg bg-white object-contain" />
            <div><label className="field-label">Image placement<select disabled={finishState === 'loading' || artworkUploadState === 'uploading'} className="mt-1 w-full rounded-lg border bg-white p-2 text-xs" value={uploadedArtwork.placement} onChange={event => setUploadedArtwork(current => current ? { ...current, placement: event.target.value as UploadedArtwork['placement'] } : current)}>{template.endsWith('-devotional') && <option value="replace-header">Replace devotional picture</option>}<option value="above-details">Above the details</option><option value="below-details">Below the details</option></select></label>
            <label className="field-label">Image size<select disabled={finishState === 'loading' || artworkUploadState === 'uploading'} className="mt-1 w-full rounded-lg border bg-white p-2 text-xs" value={uploadedArtwork.size} onChange={event => setUploadedArtwork(current => current ? { ...current, size: event.target.value as UploadedArtwork['size'] } : current)}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>
            <button type="button" disabled={finishState === 'loading' || artworkUploadState === 'uploading'} className="mt-3 text-xs font-bold text-[#9d3030] underline" onClick={() => { setUploadedArtwork(undefined); setArtworkUploadError(''); setArtworkUploadState('idle'); }}>Remove uploaded image</button></div>
          </div>}
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">The preview updates immediately. Apply your choices or save the biodata to keep the image for your next login and PDF download.</p>
          {artworkUploadError && <p className="ai-error" role="alert">{artworkUploadError}</p>}
          <span className="sr-only" aria-live="polite">{artworkUploadState === 'uploading' ? 'Uploading artwork' : uploadedArtwork ? 'Artwork ready in preview' : ''}</span>
        </section>
        </fieldset>
        <p className="privacy-note">Your uploaded image is stored privately with your account and included in the biodata and PDF. It is not sent to Groq. Your visual choices, introduction and field labels are sent to Groq; other field values are not sent.</p>
        {currentFinishReview && <section className="finish-review" aria-label="Review proposed changes" aria-live="polite">
          <h3 className="font-serif text-2xl">Review the exact changes</h3>
          <p className="mt-2 text-xs leading-5">{currentFinishReview.result.changes.length ? 'Only the changes listed below will be applied. Your template, photo file and field values are preserved.' : 'Your settings already match this request. No content or design changes are proposed; you can save the completed biodata.'}</p>
          {currentFinishReview.result.changes.length > 0 && <div className="finish-review-list">{currentFinishReview.result.changes.map(change => <div key={change.target}><strong>{change.label}</strong><dl><div><dt>Current</dt><dd>{change.before || '(empty)'}</dd></div><div><dt>Proposed</dt><dd>{change.after || '(empty)'}</dd></div></dl></div>)}</div>}
          <div className="mt-4 flex flex-wrap gap-3"><button className="primary-button" disabled={finishState === 'saving'} onClick={() => void applyReviewedFinish()}>{finishState === 'saving' ? 'Saving verified changes…' : 'Apply these changes & save'}</button><button className="soft-button" disabled={finishState === 'saving'} onClick={() => { setFinishReview(undefined); setFinishError(''); }}>Discard proposed changes</button></div>
        </section>}
        {finishReview && !currentFinishReview && <output className="privacy-note block">Your instructions or biodata changed. Review a fresh plan before applying it.</output>}
        {finishError && <p className="ai-error" role="alert">{finishError}</p>}
        {!currentFinishReview && <button className="primary-button mt-6 w-full justify-center py-3.5" onClick={finishWithAi} disabled={finishState === 'loading' || finishState === 'saving' || artworkUploadState === 'uploading'}><Sparkles size={17} /> {finishState === 'loading' ? 'Checking your requested edits…' : 'Review changes with AI'}</button>}
      </Modal>}
    </main>
  );
}

function Modal({ children, onClose, label, wide = false, busy = false }: { children: React.ReactNode; onClose: () => void; label: string; wide?: boolean; busy?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (dialog.current && !dialog.current.open) dialog.current.showModal(); }, []);
  function close() { if (dialog.current?.open) dialog.current.close(); else onClose(); }
  return <dialog ref={dialog} className={`modal-card ${wide ? 'wide' : ''}`} aria-label={label} aria-modal="true" onCancel={event => { if (busy) event.preventDefault(); }} onClose={onClose}><button className="modal-close" disabled={busy} onClick={close} aria-label="Close dialog"><X size={18} /></button>{children}</dialog>;
}

