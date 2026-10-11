import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { DEV_ONLY_ATTRIBUTE, TEST_DEMO_PASSWORD, TEST_OTP_CODE } from './src/features/auth/testMode'

/**
 * Production safety for test mode (see src/features/auth/config.ts). Fails the production build if the
 * output contains the test code or the demo password as a string, or any dev-only banner/panel (they all carry
 * DEV_ONLY_ATTRIBUTE). Both should be impossible, because MOCK_AUTH is `false` in a production build and
 * that code is dropped; this check proves it on every build.
 */
function testModeSafety(): Plugin {
  const quoted = (value: string) => new RegExp(`["'\`]${value}["'\`]`)
  const code = quoted(TEST_OTP_CODE)
  const password = quoted(TEST_DEMO_PASSWORD)
  return {
    name: 'gwani-test-mode-safety',
    apply: 'build',
    generateBundle(_options, bundle) {
      const problems: string[] = []
      for (const [file, output] of Object.entries(bundle)) {
        const text = output.type === 'chunk' ? output.code : typeof output.source === 'string' ? output.source : ''
        if (code.test(text)) problems.push(`${file}: contains the test one-time code`)
        if (password.test(text)) problems.push(`${file}: contains the demo password`)
        if (text.includes(DEV_ONLY_ATTRIBUTE)) problems.push(`${file}: contains a dev-only banner or panel (${DEV_ONLY_ATTRIBUTE})`)
      }
      if (problems.length) {
        this.error(`Test-mode code must not reach a production build:\n  - ${problems.join('\n  - ')}`)
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Mock sign-in (a fixed one-time code) must never ship: refuse to build while it's switched on,
  // whichever .env file or shell variable turned it on.
  const env = loadEnv(mode, process.cwd(), '')
  if (command === 'build' && env.VITE_MOCK_AUTH === 'true') {
    throw new Error(
      'VITE_MOCK_AUTH=true is set. Mock sign-in accepts a fixed code and must never be built. Unset it (it belongs in .env.development only) and build again.'
    )
  }
  return { plugins: [react(), ...(command === 'build' && mode === 'production' ? [testModeSafety()] : [])] }
})
