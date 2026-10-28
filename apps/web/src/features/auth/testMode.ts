/*
 * Test mode (VITE_MOCK_AUTH=true in the dev server): THE one place the test code is written down.
 *
 * App code never reads TEST_OTP_CODE directly: it uses MOCK_OTP_CODE from config.ts, which is empty
 * unless mock mode is on, so a production build drops this value entirely. vite.config.ts imports this
 * file too, and fails the production build if the code (or a dev-only banner) shows up in the bundle.
 */

/** The fixed one-time code accepted in test mode, for any valid Nigerian number. */
export const TEST_OTP_CODE = '123456';

/** Attribute every dev-only banner and panel carries; the production build fails if it's in the bundle. */
export const DEV_ONLY_ATTRIBUTE = 'data-dev-only';

/**
 * The password every demo account that signs in with a password shares (customer and vendors).
 * Obviously fake, test mode only: app code reads MOCK_DEMO_PASSWORD from config.ts, which is empty
 * outside test mode, and the production build fails if this value is in the bundle.
 */
export const TEST_DEMO_PASSWORD = 'demo-pass-0000';
