import { describe, expect, it } from 'vitest';
import i18n from '../i18n';
import { NAMESPACES } from '../i18n/config';
import { resources } from '../i18n/resources';
import { APP_NAME } from './brand';

type Tree = {[key: string]: string | Tree;};
const flatten = (tree: Tree, prefix = ''): [string, string][] =>
Object.entries(tree).flatMap(([k, v]) => typeof v === 'string' ? [[prefix + k, v] as [string, string]] : flatten(v, `${prefix}${k}.`));

/**
 * Text that still says "Gwani" on purpose: the vendor portal and the admin console aren't renamed yet.
 * Anything else with the old name is a missed spot: use {{appName}} instead.
 */
const OLD_NAME_ALLOWED: Record<string, (key: string) => boolean> = {
  vendor: () => true,
  admin: () => true,
  common: (k) => ['role.admin.label', 'message.reviewRemoved.body', 'message.warning.title', 'message.welcomeClaimed.title'].includes(k),
  auth: (k) => k.startsWith('claim.') || ['guard.staffOnly', 'terms.item3', 'error.phoneHasVendor', 'error.staffSignIn'].includes(k),
  jobs: (k) => k === 'notify.disputedVendor.body',
  payments: (k) => ['receipt.commission', 'receipt.noteCashVendor'].includes(k)
};

describe('platform name', () => {
  it('is filled in, untranslated, in both languages', async () => {
    for (const lng of ['en', 'ha']) {
      const t = i18n.getFixedT(lng);
      expect(t('common:market.footer.rights', { year: 2026 })).toContain(APP_NAME);
      expect(t('landing:meta.title')).toContain(APP_NAME);
    }
  });

  it('isn’t typed out in the buyer-side translations', () => {
    const missed = NAMESPACES.flatMap((ns) =>
    (['en', 'ha'] as const).flatMap((lng) =>
    flatten(resources[lng][ns] as Tree).
    filter(([k, v]) => /gwani/i.test(v) && !OLD_NAME_ALLOWED[ns]?.(k)).
    map(([k]) => `${lng}/${ns}:${k}`)
    )
    );
    expect(missed).toEqual([]);
  });
});
