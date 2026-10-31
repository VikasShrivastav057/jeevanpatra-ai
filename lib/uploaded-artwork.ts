export type UploadedArtwork = {
  src: string;
  placement: 'replace-header' | 'above-details' | 'below-details';
  size: 'small' | 'medium' | 'large';
};

export function isUploadedArtwork(value: unknown): value is UploadedArtwork {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<UploadedArtwork>;
  return typeof item.src === 'string' && /^\/api\/photo\/artwork-[a-f0-9-]{36}\.(jpg|png|webp)$/.test(item.src)
    && ['replace-header', 'above-details', 'below-details'].includes(item.placement || '')
    && ['small', 'medium', 'large'].includes(item.size || '');
}

