import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => {
  vi.useFakeTimers({ now: new Date('2026-10-15T09:30:00.000Z'), toFake: ['Date'] });
});
import before from './fixtures/domain-text.before.json';
import i18n from '../i18n';
import { renderText } from '../i18n/message';
import { FIXED_NOW, collectReturned, collectStored, type DomainText } from './domainTextScenarios';
import type { Text } from '../domain/message';

/*
 * The screens must show exactly what they showed before the domain returned message keys. The "before"
 * text was captured from main (43413c4) with the same scenarios (domainTextScenarios.ts), in English and
 * Hausa, under Africa/Lagos and UTC. Now the same scenarios run through translate().
 */
const offsetMinutes = new Date(FIXED_NOW).getTimezoneOffset();
const zone = offsetMinutes === -60 ? 'Africa/Lagos' : offsetMinutes === 0 ? 'UTC' : 'other';

type Fixture = { languages: Record<'en' | 'ha', DomainText>; utcOverrides: Record<'en' | 'ha', Record<string, string | null>> };

function expectedFor(language: 'en' | 'ha'): DomainText {
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

describe.skipIf(zone === 'other').each(['en', 'ha'] as const)(`domain text matches main (%s, ${zone})`, (language) => {
  it('is identical for every returned and stored message', async () => {
    await i18n.changeLanguage(language);
    const now = { ...collectReturned(render), ...collectStored(render) };
    await i18n.changeLanguage('en');
    expect(now).toEqual(expectedFor(language));
  });
});
