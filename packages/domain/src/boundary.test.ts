/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
 * The import boundary of @zamani/domain: the rules run in the browser and on the API server, so they may
 * not depend on the web app, React, icons or i18n, or on anything outside this package's src/. Only the
 * packages listed here may be imported.
 */
const SRC = dirname(fileURLToPath(import.meta.url));
const ALLOWED_PACKAGES = ['date-fns'];
const ALLOWED_IN_TESTS = ['vitest', 'node:fs', 'node:path', 'node:url'];
const FORBIDDEN = ['react', 'react-dom', 'lucide-react', 'i18next', 'react-i18next', '@zamani/web'];
// Browser and Node globals that would tie the rules to one runtime.
const GLOBALS = /\b(window|document|localStorage|sessionStorage|navigator|process)\s*[.[]/;

const packageOf = (spec: string) => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);

/** Import specifiers in a source file: static imports, re-exports, dynamic import() and require(). */
export function specifiers(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g)) out.push(m[1]);
  for (const m of source.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) out.push(m[1]);
  for (const m of source.matchAll(/\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push(m[1]);
  return out;
}

/** Problems with one file's imports (empty when it stays inside the boundary). */
export function problems(file: string, source: string): string[] {
  const isTest = /\.test\.ts$/.test(file);
  const out: string[] = [];
  for (const spec of specifiers(source)) {
    if (spec.startsWith('.')) {
      const target = resolve(dirname(file), spec);
      if (target !== SRC && !target.startsWith(SRC + sep)) out.push(`${spec}: leaves packages/domain/src`);
      if (target.split(sep).includes('apps')) out.push(`${spec}: reaches into apps/`);
      continue;
    }
    const pkg = packageOf(spec);
    if (FORBIDDEN.includes(pkg)) out.push(`${spec}: forbidden in the domain`);
    else if (!ALLOWED_PACKAGES.includes(pkg) && !(isTest && ALLOWED_IN_TESTS.includes(spec))) out.push(`${spec}: not an allowed package`);
  }
  if (!isTest) {
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    const global = GLOBALS.exec(code);
    if (global) out.push(`uses the ${global[1]} global`);
  }
  return out;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.ts$/.test(name) ? [path] : [];
  });
}

describe('@zamani/domain import boundary', () => {
  // This file is left out: its examples below contain the very imports it forbids.
  const files = sourceFiles(SRC).filter((f) => f !== fileURLToPath(import.meta.url));

  it('checks every source file', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it('imports nothing from the web app, React, icons or i18n, and stays inside src/', () => {
    const found = files.flatMap((f) => problems(f, readFileSync(f, 'utf8')).map((p) => `${relative(SRC, f)}: ${p}`));
    expect(found).toEqual([]);
  });

  it('catches each kind of violation (so the check above cannot pass by finding nothing)', () => {
    const file = join(SRC, 'features', 'jobs', 'example.ts');
    expect(problems(file, "import { useState } from 'react';")).toEqual(['react: forbidden in the domain']);
    expect(problems(file, "import type { LucideIcon } from 'lucide-react';")).toEqual(['lucide-react: forbidden in the domain']);
    expect(problems(file, "import i18n from 'i18next';")).toEqual(['i18next: forbidden in the domain']);
    expect(problems(file, "export * from '@zamani/web/src/i18n';")).toEqual(['@zamani/web/src/i18n: forbidden in the domain']);
    expect(problems(file, "import { Badge } from '../../../../../apps/web/src/components/ui/Badge';")).toEqual([
      '../../../../../apps/web/src/components/ui/Badge: leaves packages/domain/src',
      '../../../../../apps/web/src/components/ui/Badge: reaches into apps/'
    ]);
    expect(problems(file, "const m = await import('zod');")).toEqual(['zod: not an allowed package']);
    expect(problems(file, 'const lang = window.navigator.language;')).toEqual(['uses the window global']);
    expect(problems(file, "import { addDays } from 'date-fns';\nimport { JOB_STATUS } from './constants';")).toEqual([]);
  });
});
