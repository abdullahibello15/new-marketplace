/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" turns on mock sign-in (fixed OTP) in the dev server only. Builds refuse to run with it on. */
  readonly VITE_MOCK_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
