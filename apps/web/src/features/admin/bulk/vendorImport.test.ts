import { describe, expect, it } from 'vitest';
import { parseCsv } from '../../../utils/csv';
import { normalizeNigerianPhone } from '../../../utils/phone';
import { checkVendorRow, checkVendorRows, matchLga, matchTrade, vendorRowsFromTable, type VendorImportRow } from './vendorImport';
import type { ImportLookup, RawVendorRow } from './types';

const EMPTY: ImportLookup = { phones: {}, emails: {} };
const row = (over: Partial<RawVendorRow> = {}): RawVendorRow => ({
  full_name: 'Aisha Bello',
  business_name: 'Aisha Tailoring Hub',
  phone: '0803 123 4567',
  email: '',
  trade_category: 'Tailor',
  lga: 'Chanchaga',
  town_landmark: 'Tunga',
  years_experience: '',
  bio: '',
  service_areas: '',
  ...over
});
const line = (n: number, over: Partial<RawVendorRow> = {}): VendorImportRow => ({ id: `row-${n}`, line: n, raw: row(over), skipped: false });

describe('phone numbers', () => {
  it('normalises every common Nigerian format to +234', () => {
    for (const raw of ['08031234567', '0803 123 4567', '+234 803 123 4567', '2348031234567', '8031234567', '(0803) 123-4567']) {
      expect(normalizeNigerianPhone(raw)).toBe('+2348031234567');
    }
    expect(normalizeNigerianPhone('0813 000 1111')).toBe('+2348130001111');
    expect(normalizeNigerianPhone('0903 000 1111')).toBe('+2349030001111');
    expect(normalizeNigerianPhone('0703 000 1111')).toBe('+2347030001111');
  });

  it('rejects numbers that aren’t Nigerian mobiles', () => {
    for (const raw of ['0803123', '0603 123 4567', '+44 7700 900123', 'phone']) expect(normalizeNigerianPhone(raw)).toBeNull();
  });
});

describe('did you mean…?', () => {
  it('matches trades and LGAs exactly, ignoring case and spacing', () => {
    expect(matchTrade('plumber').match?.id).toBe('plumber');
    expect(matchTrade('Hair Stylist').match?.id).toBe('hair_stylist');
    expect(matchTrade('Plumbing').match?.id).toBe('plumber');
    expect(matchLga('  bosso ').match).toBe('Bosso');
  });

  it('suggests near-misses', () => {
    expect(matchTrade('Plumbr')).toEqual({ match: null, suggestion: expect.objectContaining({ id: 'plumber' }) });
    expect(matchTrade('Electrican').suggestion?.id).toBe('electrician');
    expect(matchLga('Chanchaga LGA')).toEqual({ match: null, suggestion: 'Chanchaga' });
    expect(matchLga('Sulija').suggestion).toBe('Suleja');
    expect(matchLga('Abuja')).toEqual({ match: null, suggestion: null });
  });
});

describe('row checks', () => {
  it('passes a complete row and cleans it up', () => {
    const c = checkVendorRow(row({ phone: '+234 803 123 4567', service_areas: 'Bosso; chanchaga', years_experience: '8 years' }), { lookup: EMPTY });
    expect(c.status).toBe('valid');
    expect(c.profile).toMatchObject({ phone: '+2348031234567', tradeCategory: 'tailor', lga: 'Chanchaga', serviceAreas: ['Bosso', 'Chanchaga'], yearsExperience: 8 });
  });

  it('errors on missing required fields and bad values, with suggestions', () => {
    const c = checkVendorRow(row({ full_name: '', phone: '0803123', trade_category: 'Plumbr', lga: 'Chanchaga LGA', email: 'not-an-email' }), { lookup: EMPTY });
    expect(c.status).toBe('error');
    expect(c.errors.map((e) => e.column)).toEqual(['full_name', 'phone', 'email', 'trade_category', 'lga']);
    expect(c.suggestions).toEqual([{ column: 'trade_category', value: 'Plumber', label: 'Plumber' }, { column: 'lga', value: 'Chanchaga', label: 'Chanchaga' }]);
    expect(c.profile).toBeNull();
  });

  it('warns about values it can leave out', () => {
    const c = checkVendorRow(row({ years_experience: 'ten', service_areas: 'Bosso, Abuja' }), { lookup: EMPTY });
    expect(c.status).toBe('warning');
    expect(c.profile?.yearsExperience).toBeNull();
    expect(c.profile?.serviceAreas).toEqual(['Bosso']);
  });

  it('flags vendors who already exist or were already invited', () => {
    const lookup: ImportLookup = {
      phones: { '+2348031234567': { vendorId: 'bala', vendorName: 'Bala Plumbing', kind: 'vendor', alreadyMember: false } },
      emails: { 'x@y.ng': { vendorId: 'inv', vendorName: 'Invited Ltd', kind: 'invited', alreadyMember: false } }
    };
    const existing = checkVendorRow(row(), { lookup });
    expect(existing.status).toBe('warning');
    expect(existing.existing).toMatchObject({ vendorId: 'bala', by: 'phone' });
    expect(checkVendorRow(row({ phone: '0811 111 1111', email: 'x@y.ng' }), { lookup }).status).toBe('error');
  });

  it('flags later rows that repeat a phone or email in the same file', () => {
    const checks = checkVendorRows([line(2), line(3, { phone: '+2348031234567' }), line(4, { phone: '0805 000 0000', email: 'a@b.ng' }), line(5, { phone: '0806 000 0000', email: 'A@B.ng' })], EMPTY);
    expect(checks.map((c) => c.status)).toEqual(['valid', 'error', 'valid', 'error']);
    expect(checks[1].errors[0].message).toContain('row 2');
    expect(checks[3].errors[0].message).toContain('Same email as row 4');
  });
});

describe('reading the sheet', () => {
  it('maps friendly headers to columns', () => {
    const { rows, error } = vendorRowsFromTable(parseCsv('Full name,Business name,Phone number,Trade,LGA,Town/Landmark\nAisha,Aisha Hub,08031234567,Tailor,Bosso,Tunga\n'));
    expect(error).toBeUndefined();
    expect(rows[0].raw).toMatchObject({ full_name: 'Aisha', phone: '08031234567', trade_category: 'Tailor', town_landmark: 'Tunga', email: '' });
  });

  it('says which required columns are missing', () => {
    expect(vendorRowsFromTable(parseCsv('name,phone\nA,0803\n')).error).toContain('business_name');
  });
});

describe('the sample file (public/samples/vendor-import-sample.csv)', () => {
  it('has 25 rows with the deliberate mistakes caught', async () => {
    const { readFileSync } = await import('node:fs');
    const { rows } = vendorRowsFromTable(parseCsv(readFileSync('public/samples/vendor-import-sample.csv', 'utf8')));
    const lookup: ImportLookup = {
      phones: {
        '+2348031112233': { vendorId: 'bala-plumbing', vendorName: 'Bala Plumbing Services', kind: 'vendor', alreadyMember: false },
        '+2348052201188': { vendorId: 'yusuf-borehole', vendorName: 'Yusuf Plumbing & Borehole', kind: 'vendor', alreadyMember: true },
        '+2348161230002': { vendorId: 'gana-stitches', vendorName: 'Gana Stitches', kind: 'invited', alreadyMember: true }
      },
      emails: { 'hauwa@ankara.ng': { vendorId: 'hauwa-tailoring', vendorName: 'Hauwa Tailoring & Ankara', kind: 'vendor', alreadyMember: false } }
    };
    const checks = checkVendorRows(rows, lookup);
    const byStatus = (s: string) => rows.filter((_, i) => checks[i].status === s).map((r) => r.line);
    expect(rows).toHaveLength(25);
    expect(byStatus('error')).toEqual([6, 7, 8, 9, 10, 11, 14, 20, 21, 22, 25]);
    expect(byStatus('warning')).toEqual([12, 13, 15, 23]);
    expect(checks.flatMap((c) => c.suggestions.map((s) => s.value))).toEqual(['Chanchaga', 'Plumber', 'Electrician', 'Suleja']);
  });
});
