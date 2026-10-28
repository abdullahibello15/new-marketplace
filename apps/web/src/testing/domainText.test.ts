import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => {
  vi.useFakeTimers({ now: new Date('2026-10-15T09:30:00.000Z'), toFake: ['Date'] });
});
import before from './fixtures/domain-text.before.json';
import haChanges from './fixtures/domain-text.ha-changes.json';
import i18n from '../i18n';
import { renderText } from '../i18n/message';
import { FIXED_NOW, collectReturned, collectStored, type DomainText } from './domainTextScenarios';
import type { Text } from '../domain/message';

/*
 * The screens must show what they showed before the domain returned message keys. The "before" text was
 * captured from main (43413c4) with the same scenarios (domainTextScenarios.ts), in English and Hausa,
 * under Africa/Lagos and UTC. Now the same scenarios run through translate().
 *
 * English is identical, everywhere. Hausa is identical except the seed invoice lines, which were stored
 * as English text and are now stored messages shown with the existing Hausa strings: every one of those
 * changes is listed, old and new, in fixtures/domain-text.ha-changes.json.
 */
const offsetMinutes = new Date(FIXED_NOW).getTimezoneOffset();
const zone = offsetMinutes === -60 ? 'Africa/Lagos' : offsetMinutes === 0 ? 'UTC' : 'other';

type Fixture = { languages: Record<'en' | 'ha', DomainText>; utcOverrides: Record<'en' | 'ha', Record<string, string | null>> };
type Change = { before: string | null; after: string | null };

function beforeFor(language: 'en' | 'ha'): DomainText {
  const f = before as Fixture;
  const out = { ...f.languages[language] };
  if (zone === 'UTC') {
    for (const [id, text] of Object.entries(f.utcOverrides[language])) {
      if (text === null) delete out[id];else out[id] = text;
    }
  }
  return out;
}

const render = (value: unknown): string =>
  value instanceof Error ? renderText((value as Error & { reason: Text }).reason) : renderText(value as Text);

async function textIn(language: 'en' | 'ha'): Promise<DomainText> {
  await i18n.changeLanguage(language);
  const text = { ...collectReturned(render), ...collectStored(render) };
  await i18n.changeLanguage('en');
  return text;
}

function differences(was: DomainText, now: DomainText): Record<string, Change> {
  const out: Record<string, Change> = {};
  for (const id of new Set([...Object.keys(was), ...Object.keys(now)])) {
    if (was[id] !== now[id]) out[id] = { before: was[id] ?? null, after: now[id] ?? null };
  }
  return out;
}

describe.skipIf(zone === 'other')(`domain text compared with main (${zone})`, () => {
  it('English is identical for every returned and stored message', async () => {
    expect(await textIn('en')).toEqual(beforeFor('en'));
  });

  it('Hausa differs only by the listed seed invoice lines', async () => {
    const changed = differences(beforeFor('ha'), await textIn('ha'));
    expect(changed).toEqual(haChanges.changes);
    expect(Object.keys(changed).filter((id) => !id.startsWith('seed:invoice:'))).toEqual([]);
  });
});
