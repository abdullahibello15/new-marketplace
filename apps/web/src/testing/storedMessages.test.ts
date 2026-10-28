import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => {
  vi.useFakeTimers({ now: new Date('2026-10-15T09:30:00.000Z'), toFake: ['Date'] });
});
import { isMessage, type Message } from '../domain/message';
import { collectStored } from './domainTextScenarios';

/*
 * Escrow ledger notes and invoice line labels are stored. The API will keep them as jsonb, so a stored
 * message must be plain JSON: it has to come back from JSON.stringify / JSON.parse exactly as it went in.
 */
function storedMessages(): Message[] {
  const out: Message[] = [];
  collectStored((value) => {
    if (isMessage(value)) out.push(value);
    return '';
  });
  return out;
}

/** Only the shapes domain/message.ts allows, with nothing JSON would drop or change. */
function plainJsonProblems(value: unknown, path = '$'): string[] {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return [];
  if (typeof value === 'number') return Number.isFinite(value) ? [] : [`${path}: ${value}`];
  if (Array.isArray(value)) return value.flatMap((v, i) => plainJsonProblems(v, `${path}[${i}]`));
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.entries(value).flatMap(([k, v]) => (v === undefined ? [`${path}.${k}: undefined`] : plainJsonProblems(v, `${path}.${k}`)));
  }
  return [`${path}: ${Object.prototype.toString.call(value)}`];
}

describe('stored messages', () => {
  const messages = storedMessages();

  it('covers the ledger notes and invoice lines, seed data included', () => {
    const keys = new Set(messages.map((m) => m.key));
    expect(keys).toContain('payments:escrowNote.paidIn');
    expect(keys).toContain('payments:escrowNote.cancelledLessFee');
    expect(keys).toContain('vendor:subscription.line.month');
    expect(keys).toContain('vendor:association.line.member');
    expect(messages.length).toBeGreaterThan(500);
  });

  it('are plain JSON values (no undefined, Date, class instances or NaN)', () => {
    expect(messages.flatMap((m, i) => plainJsonProblems(m, `#${i} ${m.key}`))).toEqual([]);
  });

  it('survive JSON.stringify and JSON.parse unchanged', () => {
    for (const m of messages) expect(JSON.parse(JSON.stringify(m)), m.key).toStrictEqual(m);
  });

  it('keep money in kobo inside the stored params', () => {
    const fee = messages.find((m) => m.key === 'payments:escrowNote.cancelledLessFee');
    expect(fee?.params).toEqual({ fee: { type: 'money', kobo: 160_000 } });
  });
});
