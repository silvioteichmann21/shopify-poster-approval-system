const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export function extensionForImageType(type: string) {
  switch (type) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
}

export function validatePreviewUpload(file: { type: string; size: number }) {
  const type = (file.type || '').toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(type)) {
    return { ok: false as const, error: 'Upload a PNG, JPG, WEBP, or GIF image.' };
  }
  if (file.size <= 0) {
    return { ok: false as const, error: 'File is empty.' };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false as const, error: 'Image must be under 15 MB.' };
  }
  return { ok: true as const, type };
}

export function previewImagePublicUrl(baseUrl: string, storageKey: string) {
  return `${baseUrl.replace(/\/$/, '')}/preview-images/${storageKey}`;
}

export function previewImageStorageKey(leadId: string, filename: string) {
  const safeLead = leadId.replace(/[^a-zA-Z0-9]/g, '');
  const safeFile = filename.replace(/[^a-zA-Z0-9._-]/g, '');
  return `${safeLead}/${safeFile}`;
}
