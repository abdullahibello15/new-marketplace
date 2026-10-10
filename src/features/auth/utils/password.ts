import { PASSWORD } from '../constants';

export interface PasswordStrength {
  /** 0 (too short) to 4 (strong). */
  score: 0 | 1 | 2 | 3 | 4;
  /** Key under auth:password.strength (shown translated by PasswordInput). */
  label: 'tooShort' | 'weak' | 'fair' | 'good' | 'strong';
}

const COMMON = ['password', '12345678', '123456789', 'qwertyui', 'iloveyou', 'gwani123', 'abcdefgh', '11111111'];

/**
 * A rough strength guide for the meter (the only hard rule is the minimum length, PASSWORD.minLength):
 * longer is better, and mixing lower/upper case, digits and symbols helps; common passwords are weak.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (password.length < PASSWORD.minLength) return { score: 0, label: 'tooShort' };
  if (COMMON.includes(password.toLowerCase())) return { score: 1, label: 'weak' };
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  let points = kinds + (password.length >= 12 ? 1 : 0) + (password.length >= 16 ? 1 : 0);
  if (/^(.)\1+$/.test(password)) points = 0;
  if (points <= 1) return { score: 1, label: 'weak' };
  if (points === 2) return { score: 2, label: 'fair' };
  if (points === 3) return { score: 3, label: 'good' };
  return { score: 4, label: 'strong' };
}
