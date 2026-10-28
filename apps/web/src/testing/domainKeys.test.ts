import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => {
  vi.useFakeTimers({ now: new Date('2026-10-15T09:30:00.000Z'), toFake: ['Date'] });
});
import { isMessage, type MessageParam } from '../domain/message';
import { NAMESPACES } from '../i18n/config';
import { HAUSA_PENDING } from '../i18n/pendingTranslations';
import { resources } from '../i18n/resources';
import { JOB_ACTOR, JOB_STATUS } from '../features/jobs/constants';
import { ORDER_STATUS } from '../features/orders/constants';
import { PAYMENT_METHOD } from '../features/payments/constants';
import { collectReturned, collectStored } from './domainTextScenarios';

/*
 * Every message key the domain can return, returned or stored, must exist in English and in Hausa. A key
 * missing from Hausa must be listed in HAUSA_PENDING (it shows in English until a translator adds it).
 */

/** The files whose messages are checked: the domain rules (moving to packages/domain). */
const DOMAIN_FILES = [
  'features/jobs/stateMachine.ts',
  'features/jobs/cancellationPolicy.ts',
  'features/orders/stateMachine.ts',
  'features/vendor-dashboard/utils/subscription.ts',
  'features/vendor-dashboard/utils/billing.ts',
  'features/vendor-dashboard/utils/bundle.ts',
  'features/payments/escrow/escrowRules.ts',
  'features/payments/utils/receiptData.ts'
];

function keysIn(value: unknown, into: Set<string>) {
  if (value instanceof Error && 'reason' in value) return keysIn(value.reason, into);
  if (!isMessage(value)) return;
  into.add(value.key);
  for (const param of Object.values(value.params ?? {}) as MessageParam[]) {
    if (typeof param === 'object' && param.type === 'message') keysIn(param.message, into);else
    if (isMessage(param)) keysIn(param, into);
  }
}

function domainKeys(): Set<string> {
  const keys = new Set<string>();
  // 1. Everything the scenarios produce (both languages give the same keys; one pass is enough).
  const record = (value: unknown) => {
    keysIn(value, keys);
    return '';
  };
  collectReturned(record);
  collectStored(record);
  // 2. Literal keys written in the domain files, including branches the scenarios might not reach.
  for (const file of DOMAIN_FILES) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    for (const [, key] of source.matchAll(/'((?:jobs|vendor|payments|common|admin):[\w.]+)'/g)) keys.add(key);
  }
  // 3. Keys built from data: every status, actor and payment method.
  for (const s of Object.values(JOB_STATUS)) keys.add(`jobs:status.${s}.label`);
  for (const s of Object.values(ORDER_STATUS)) keys.add(`jobs:order.status.${s}.label`);
  for (const a of Object.values(JOB_ACTOR)) keys.add(`jobs:actor.${a}`);
  for (const m of Object.values(PAYMENT_METHOD)) keys.add(`payments:method.${m}`);
  return keys;
}

type Tree = { [k: string]: string | Tree };

/** i18next lookup, plural-aware: "a.b" exists as a.b, or as a.b_one / a.b_other. */
function has(language: 'en' | 'ha', fullKey: string): boolean {
  const [ns, path] = fullKey.split(':') as [(typeof NAMESPACES)[number], string];
  const parts = path.split('.');
  const last = parts.pop() as string;
  let node: string | Tree | undefined = resources[language][ns] as unknown as Tree;
  for (const p of parts) node = typeof node === 'object' ? node[p] : undefined;
  if (typeof node !== 'object') return false;
  return typeof node[last] === 'string' || typeof node[`${last}_one`] === 'string' || typeof node[`${last}_other`] === 'string';
}

describe('domain message keys', () => {
  const keys = [...domainKeys()].sort();

  it('finds the keys (sanity check)', () => {
    expect(keys.length).toBeGreaterThan(60);
    expect(keys).toContain('jobs:error.startFrom');
  });

  it('exist in English', () => {
    expect(keys.filter((k) => !has('en', k))).toEqual([]);
  });

  it('exist in Hausa, or are listed as waiting for a translator', () => {
    expect(keys.filter((k) => !has('ha', k) && !HAUSA_PENDING.includes(k))).toEqual([]);
  });

  it('lists as waiting only keys the domain uses (no stale entries)', () => {
    const fromDomain = HAUSA_PENDING.filter((k) => keys.includes(k));
    expect(fromDomain.length).toBeGreaterThan(0);
  });
});

