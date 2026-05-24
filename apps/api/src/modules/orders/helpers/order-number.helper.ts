import { randomBytes } from 'crypto';

export const generateOrderNumber = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `PC-${yyyy}${mm}${dd}-${suffix}`;
};
