import { describe, expect, it } from 'vitest';
import { NAMESPACES } from './config';
import { resources } from './resources';

/*
 * Every English key must exist in Hausa (the build of a page must never fall back to English silently),
 * with the same {{placeholders}}, and Hausa must not keep keys English no longer has.
 */

type Tree = {[key: string]: string | Tree;};

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.set(key, v);else
    for (const [kk, vv] of flatten(v, key)) out.set(kk, vv);
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

describe.each(NAMESPACES)('locales: %s', (ns) => {
  const en = flatten(resources.en[ns] as Tree);
  const ha = flatten(resources.ha[ns] as Tree);

  it('has every English key in Hausa', () => {
    const missing = [...en.keys()].filter((k) => !ha.has(k));
    expect(missing, `Missing in ha/${ns}.json`).toEqual([]);
  });

  it('has no Hausa keys that English dropped', () => {
    const extra = [...ha.keys()].filter((k) => !en.has(k));
    expect(extra, `Only in ha/${ns}.json`).toEqual([]);
  });

  it('keeps the same {{placeholders}}', () => {
    const wrong = [...en].filter(([k, v]) => ha.has(k) && placeholders(v).join() !== placeholders(ha.get(k) as string).join()).map(([k]) => k);
    expect(wrong, `Placeholders differ in ha/${ns}.json`).toEqual([]);
  });

  it('has no empty translations', () => {
    expect([...ha].filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual([]);
  });
});
