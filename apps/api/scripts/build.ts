// Bundles the API entry point into dist/ (npm run build --workspace apps/api).
// Workspace packages (@zamani/*) are bundled in; everything else in `dependencies` stays external and
// comes from node_modules, so Sentry's and pino's runtime behaviour is unchanged.
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  dependencies: Record<string, string>
}

await build({
  entryPoints: ['src/server.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  external: Object.keys(pkg.dependencies).filter((name) => !name.startsWith('@zamani/')),
  logLevel: 'info',
})
