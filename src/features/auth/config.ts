import { AUTH_ROUTES } from './constants';
import { TEST_DEMO_PASSWORD, TEST_OTP_CODE } from './testMode';

/*
 * Auth switches.
 *
 * MOCK_AUTH (test mode) is true ONLY in the dev server (`npm run dev`) with VITE_MOCK_AUTH=true (see
 * .env.example). Then the fixed test code is accepted, and the dev-only banners and demo panels show.
 *
 * It can't reach production:
 *  - import.meta.env.DEV is replaced with `false` in a production build, so this whole expression is
 *    `false` there, MOCK_OTP_CODE is '', and the test code is dropped from the bundle;
 *  - vite.config.ts refuses to build while VITE_MOCK_AUTH=true, and fails the production build if the
 *    test code or a dev-only banner is found in the bundle.
 */
export const MOCK_AUTH = import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH === 'true';

/** The test one-time code in mock mode; empty (never accepted, not in the bundle) otherwise. */
export const MOCK_OTP_CODE: string = MOCK_AUTH ? TEST_OTP_CODE : '';

/** The demo accounts' password in mock mode; empty (no demo account has a password) otherwise. */
export const MOCK_DEMO_PASSWORD: string = MOCK_AUTH ? TEST_DEMO_PASSWORD : '';

/** MOCK mode only: sending a code to a number ending in this fails like a dropped connection, to try the error state. */
export const MOCK_NETWORK_FAILURE_SUFFIX = '9999';

/**
 * Login required for the whole app. true: signed-out visitors only see the public pages below and are
 * sent to the landing page from anywhere else (then back after signing in). false: browse freely,
 * sign in only for booking, ordering, payments and accounts (each page's own guard decides).
 */
export const REQUIRE_LOGIN = true;

/**
 * Open without signing in when REQUIRE_LOGIN is on: the landing page, login (with its OTP step), forgot
 * password, signup (role picker and forms), terms, invitation claims (a signup) and the staff login.
 */
export const PUBLIC_PATHS: readonly {path: string;prefix?: boolean;}[] = [
{ path: AUTH_ROUTES.start },
{ path: AUTH_ROUTES.login },
{ path: `${AUTH_ROUTES.login}/`, prefix: true },
{ path: AUTH_ROUTES.signup },
{ path: `${AUTH_ROUTES.signup}/`, prefix: true },
{ path: '/terms/', prefix: true },
{ path: '/claim/', prefix: true },
{ path: AUTH_ROUTES.staffLogin }];


export const isPublicPath = (pathname: string) => PUBLIC_PATHS.some((p) => p.prefix ? pathname.startsWith(p.path) : pathname === p.path || pathname === `${p.path}/`);
