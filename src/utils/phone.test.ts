import { describe, expect, it } from 'vitest';
import { formatLocalPhone, isNigerianMobile, maskPhone, normalizeNigerianPhone, phoneError } from './phone';

describe('Nigerian phone numbers', () => {
  it('normalises +234, 234, 0 and bare formats to +234XXXXXXXXXX', () => {
    for (const raw of ['08031234567', '0803 123 4567', '+234 803 123 4567', '+2348031234567', '2348031234567', '8031234567', '(0803) 123-4567']) {
      expect(normalizeNigerianPhone(raw)).toBe('+2348031234567');
    }
  });

  it('accepts 070, 080, 081, 090 and 091', () => {
    for (const prefix of ['070', '080', '081', '090', '091']) expect(normalizeNigerianPhone(`${prefix}12345678`)).toBe(`+234${prefix.slice(1)}12345678`);
  });

  it('rejects other numbers with a clear message', () => {
    for (const raw of ['0803123', '0603 123 4567', '0823 123 4567', '+44 7700 900123', 'phone', '']) expect(normalizeNigerianPhone(raw)).toBeNull();
    expect(phoneError('0803')).toMatch(/Nigerian mobile number/);
    expect(phoneError('')).toBe('Enter your phone number.');
    expect(phoneError('0803 555 0142')).toBeNull();
  });

  it('formats and masks for display', () => {
    expect(formatLocalPhone('+2348035550142')).toBe('0803 555 0142');
    expect(maskPhone('+2348035550142')).toBe('+234 803 ••• 0142');
    expect(isNigerianMobile('0803 555 0142')).toBe(true);
  });
});
