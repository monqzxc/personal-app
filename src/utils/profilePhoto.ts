export const PROFILE_PHOTO_SIZE = 256;
export const MAX_PROFILE_PHOTO_LENGTH = 128 * 1024;
const JPEG_PREFIX = 'data:image/jpeg;base64,';

export function isProfilePhoto(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > MAX_PROFILE_PHOTO_LENGTH || !value.startsWith(JPEG_PREFIX)) return false;
  const base64 = value.slice(JPEG_PREFIX.length);
  return base64.startsWith('/9j/') && base64.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(base64);
}

export function squarePhotoCrop(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) throw new Error('This photo could not be read. Choose another image.');
  const side = Math.floor(Math.min(width, height));
  return { originX: Math.floor((width - side) / 2), originY: Math.floor((height - side) / 2), width: side, height: side };
}
