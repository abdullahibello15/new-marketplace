import { NIGERIAN_MOBILE_PATTERN } from '../constants';

/** Drops spaces, dashes, dots and brackets: "0803 555-0142" → "08035550142". */
export const stripPhone = (raw: string) => raw.replace(/[\s().-]/g, '');

export const isNigerianMobile = (raw: string) => NIGERIAN_MOBILE_PATTERN.test(stripPhone(raw));

/** "0803 555 0142" or "+234 803 555 0142" → "+2348035550142". Call only after isNigerianMobile. */
export function toE164(raw: string): string {
  const digits = stripPhone(raw);
  return digits.startsWith('+234') ? digits : `+234${digits.slice(1)}`;
}

/** "+2348035550142" → "0803 555 0142", how Nigerians write numbers. */
export function formatLocalPhone(e164: string): string {
  const local = e164.startsWith('+234') ? `0${e164.slice(4)}` : e164;
  return /^\d{11}$/.test(local) ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : local;
}

/** "+234 803 ••• 0142": enough to recognise the number in a log without showing all of it. */
export const maskPhone = (e164: string) => `${e164.slice(0, 4)} ${e164.slice(4, 7)} ••• ${e164.slice(-4)}`;
