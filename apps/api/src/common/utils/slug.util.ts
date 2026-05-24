import { randomBytes } from 'crypto';

const SLUG_MAX_LENGTH = 120;

export const slugify = (value: string): string => {
  const normalized = value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.slice(0, SLUG_MAX_LENGTH) || 'item';
};

export const generateUniqueSlug = (base: string): string => {
  const slug = slugify(base);
  const suffix = randomBytes(3).toString('hex');
  return `${slug}-${suffix}`.slice(0, SLUG_MAX_LENGTH);
};
