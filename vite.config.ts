import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

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
  return { plugins: [react()] }
})
