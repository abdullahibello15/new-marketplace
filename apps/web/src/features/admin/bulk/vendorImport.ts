import { nigerLgas } from '../../../data/nigerLgas';
import { OTHER_TRADE, tradeCategories } from '../../../data/tradeCategories';
import { normalizeNigerianPhone } from '../../../utils/phone';
import { csvWithBom, mapTableToRows, matchOption, type ImportSpec, type SpreadsheetRow } from '../../../utils/spreadsheetImport';
import { VENDOR_IMPORT } from '../config/bulkImport';
import { VENDOR_IMPORT_COLUMNS, type ExistingMatch, type ImportLookup, type RawVendorRow, type RowSuggestion, type VendorImportColumn, type VendorRowCheck } from './types';
import type { NigerLga, TradeCategory } from '../../../types/marketplace';

/*
 * THE rules for the bulk vendor import (pure, runs in the browser). Columns and header spellings, the
 * template, and the per-row checks: required fields, Nigerian phone numbers in one format, trade and LGA
 * against the shared lists with "did you mean…?", duplicates inside the file, and vendors who already
 * exist. Tested in vendorImport.test.ts.
 */

export type VendorImportRow = SpreadsheetRow<VendorImportColumn>;

export const COLUMN_LABELS: Record<VendorImportColumn, string> = {
  full_name: 'Full name',
  business_name: 'Business name',
  phone: 'Phone',
  email: 'Email',
  trade_category: 'Trade category',
  lga: 'LGA',
  town_landmark: 'Town / landmark',
  years_experience: 'Years of experience',
  bio: 'Short bio',
  service_areas: 'Service areas'
};

const REQUIRED: VendorImportColumn[] = ['full_name', 'business_name', 'phone', 'trade_category', 'lga', 'town_landmark'];

export const VENDOR_IMPORT_SPEC: ImportSpec<VendorImportColumn> = {
  columns: VENDOR_IMPORT_COLUMNS,
  required: REQUIRED,
  aliases: {
    name: 'full_name',
    owner: 'full_name',
    owner_name: 'full_name',
    business: 'business_name',
    shop_name: 'business_name',
    phone_number: 'phone',
    mobile: 'phone',
    whatsapp: 'phone',
    email_address: 'email',
    trade: 'trade_category',
    category: 'trade_category',
    local_government: 'lga',
    town: 'town_landmark',
    landmark: 'town_landmark',
    address: 'town_landmark',
    town_or_landmark: 'town_landmark',
    'town/landmark': 'town_landmark',
    years: 'years_experience',
    experience: 'years_experience',
    years_of_experience: 'years_experience',
    short_bio: 'bio',
    about: 'bio',
    areas: 'service_areas'
  },
  maxRows: VENDOR_IMPORT.maxRows,
  noun: { one: 'vendor', many: 'vendors' }
};

export const vendorRowsFromTable = (table: string[][]) => mapTableToRows(table, VENDOR_IMPORT_SPEC);

export function buildVendorTemplateCsv(): string {
  return csvWithBom([
  [...VENDOR_IMPORT_COLUMNS],
  ['Aisha Bello', 'Aisha Tailoring Hub', '0803 123 4567', 'aisha@example.com', 'Tailor', 'Chanchaga', 'Tunga, near the Kure Market gate', '8', 'Ankara, kaftans and school uniforms. Alterations in 2 days.', 'Chanchaga; Bosso']]
  );
}

/* ---------- Matching ---------- */

const TRADE_OPTIONS: {id: TradeCategory;label: string;names: string[];}[] = [
...tradeCategories.map((c) => ({ id: c.id, label: c.label, names: [c.id.replace(/_/g, ' '), c.label, c.browseLabel] })),
{ id: OTHER_TRADE, label: 'Other', names: ['Other'] }];


export const TRADE_LABEL = (id: TradeCategory) => TRADE_OPTIONS.find((o) => o.id === id)?.label ?? id;
export const TRADE_SELECT_OPTIONS = TRADE_OPTIONS.map((o) => ({ value: o.label, label: o.label }));

export const matchTrade = (raw: string) => matchOption(raw, TRADE_OPTIONS, (o) => o.names);
export const matchLga = (raw: string) => matchOption(raw, nigerLgas, (l) => [l], { ignoreWords: ['lga', 'local', 'government', 'area', 'state', 'niger'] });


const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const splitList = (raw: string) => raw.split(/[;,|/]+/).map((s) => s.trim()).filter(Boolean);

/* ---------- Checking ---------- */

export interface RowContext {
  /** Existing vendors and invited drafts. */
  lookup: ImportLookup;
  /** Spreadsheet row number of an earlier row with the same phone or email, if any. */
  duplicateOf?: {line: number;by: 'phone' | 'email';};
}

/** Checks one row. Errors block it; warnings don't. Suggestions can be applied with one click. */
export function checkVendorRow(raw: RawVendorRow, ctx: RowContext): VendorRowCheck {
  const errors: VendorRowCheck['errors'] = [];
  const warnings: string[] = [];
  const suggestions: RowSuggestion[] = [];
  const fail = (column: VendorImportColumn, message: string) => errors.push({ column, message });
  const text = (column: VendorImportColumn) => raw[column].trim();

  for (const column of ['full_name', 'business_name'] as const) {
    const v = text(column);
    if (!v) fail(column, `${COLUMN_LABELS[column]} is missing.`);else
    if (v.length < 2) fail(column, `${COLUMN_LABELS[column]} is too short.`);else
    if (v.length > VENDOR_IMPORT.nameMaxLength) fail(column, `${COLUMN_LABELS[column]} is over ${VENDOR_IMPORT.nameMaxLength} characters.`);
  }

  const phone = text('phone') ? normalizeNigerianPhone(text('phone')) : null;
  if (!text('phone')) fail('phone', 'Phone is missing.');else
  if (!phone) fail('phone', `“${text('phone')}” isn’t a Nigerian mobile number. Use 11 digits like 0803 123 4567, or +234 803 123 4567.`);

  const email = text('email').toLowerCase() || null;
  if (email && !EMAIL.test(email)) fail('email', `“${text('email')}” isn’t an email address.`);

  const trade = matchTrade(text('trade_category'));
  if (!text('trade_category')) fail('trade_category', 'Trade category is missing.');else
  if (!trade.match) {
    fail('trade_category', `“${text('trade_category')}” isn’t a trade category.${trade.suggestion ? '' : ` Use one of: ${TRADE_OPTIONS.map((o) => o.label).join(', ')}.`}`);
    if (trade.suggestion) suggestions.push({ column: 'trade_category', value: trade.suggestion.label, label: trade.suggestion.label });
  }

  const lga = matchLga(text('lga'));
  if (!text('lga')) fail('lga', 'LGA is missing.');else
  if (!lga.match) {
    fail('lga', `“${text('lga')}” isn’t a Niger State LGA.`);
    if (lga.suggestion) suggestions.push({ column: 'lga', value: lga.suggestion, label: lga.suggestion });
  }

  if (!text('town_landmark')) fail('town_landmark', 'Town or landmark is missing.');

  let years: number | null = null;
  if (text('years_experience')) {
    const n = Number(text('years_experience').replace(/\s*(years?|yrs?)$/i, ''));
    if (Number.isInteger(n) && n >= 0 && n <= VENDOR_IMPORT.maxYearsExperience) years = n;else
    warnings.push(`Years of experience “${text('years_experience')}” isn’t a whole number of years; it will be left blank.`);
  }

  if (text('bio').length > VENDOR_IMPORT.bioMaxLength) fail('bio', `Bio is over ${VENDOR_IMPORT.bioMaxLength} characters (${text('bio').length}).`);

  const areas: NigerLga[] = [];
  const unknownAreas: string[] = [];
  for (const area of splitList(text('service_areas'))) {
    const m = matchLga(area);
    if (m.match) areas.push(m.match);else
    unknownAreas.push(m.suggestion ? `${area} (did you mean ${m.suggestion}?)` : area);
  }
  if (unknownAreas.length) warnings.push(`Service areas left out, not Niger State LGAs: ${unknownAreas.join(', ')}.`);

  if (ctx.duplicateOf) fail(ctx.duplicateOf.by, `Same ${ctx.duplicateOf.by} as row ${ctx.duplicateOf.line}. Each vendor can only be imported once.`);

  let existing: ExistingMatch | null = null;
  const byPhone = phone ? ctx.lookup.phones[phone] : undefined;
  const byEmail = email ? ctx.lookup.emails[email] : undefined;
  if (byPhone) existing = { ...byPhone, by: 'phone' };else
  if (byEmail) existing = { ...byEmail, by: 'email' };
  if (existing?.kind === 'invited') fail(existing.by, `Already invited as ${existing.vendorName} in an earlier import, and not claimed yet.`);else
  if (existing?.alreadyMember) warnings.push(`${existing.vendorName} is already on Gwani and already a member of this association. Nothing to do; it will be skipped.`);else
  if (existing) warnings.push(`${existing.vendorName} is already on Gwani (same ${existing.by}). Choose Skip, or Link to add them to the association.`);

  const profile =
  errors.length === 0 && phone && trade.match && lga.match ?
  {
    fullName: text('full_name'),
    businessName: text('business_name'),
    phone,
    email,
    tradeCategory: trade.match.id,
    lga: lga.match,
    town: text('town_landmark'),
    yearsExperience: years,
    bio: text('bio'),
    serviceAreas: areas.length ? [...new Set(areas)] : [lga.match]
  } :
  null;

  return { status: errors.length ? 'error' : warnings.length ? 'warning' : 'valid', errors, warnings, suggestions, profile, existing };
}

/** Checks every row (skipped ones too), flagging later rows that repeat an earlier phone or email. */
export function checkVendorRows(rows: readonly VendorImportRow[], lookup: ImportLookup): VendorRowCheck[] {
  const seenPhone = new Map<string, number>();
  const seenEmail = new Map<string, number>();
  return rows.map((row) => {
    const phone = normalizeNigerianPhone(row.raw.phone);
    const email = row.raw.email.trim().toLowerCase();
    let duplicateOf: RowContext['duplicateOf'];
    if (phone && seenPhone.has(phone)) duplicateOf = { line: seenPhone.get(phone) as number, by: 'phone' };else
    if (email && seenEmail.has(email)) duplicateOf = { line: seenEmail.get(email) as number, by: 'email' };
    if (phone && !seenPhone.has(phone)) seenPhone.set(phone, row.line);
    if (email && !seenEmail.has(email)) seenEmail.set(email, row.line);
    return checkVendorRow(row.raw, { lookup, duplicateOf });
  });
}
