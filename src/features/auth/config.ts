/*
 * Mock sign-in switch.
 *
 * MOCK_AUTH is true ONLY in the dev server (`npm run dev`) with VITE_MOCK_AUTH=true (see .env.development).
 * Then the fixed test code below is accepted and shown in a dev-only banner.
 *
 * It can't reach production:
 *  - import.meta.env.DEV is replaced with `false` in a production build, so this whole expression is
 *    `false` there and the test code is dropped from the bundle;
 *  - vite.config.ts refuses to build at all while VITE_MOCK_AUTH=true.
 */
export const MOCK_AUTH = import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH === 'true';

/** The test one-time code (mock mode only). */
export const MOCK_OTP_CODE = '123456';

/** MOCK mode only: sending a code to a number ending in this fails like a dropped connection, to try the error state. */
export const MOCK_NETWORK_FAILURE_SUFFIX = '9999';
