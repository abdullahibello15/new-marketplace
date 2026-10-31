import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AUTH_ROUTES } from '../constants';
import { endedSessionLoginPath, isVendorPortalPath, shouldRedirectForEndedSession } from './guards';

const mock = vi.hoisted(() => ({ vendorStatus: 'ready', signOut: vi.fn(async () => undefined), clear: vi.fn() }));
vi.mock('../../vendor-profile/context/CurrentVendorContext', () => ({ useCurrentVendorData: () => ({ status: mock.vendorStatus, clear: mock.clear }) }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ signOut: mock.signOut }) }));
vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({ t: (key: string) => key }),
}));
import { RequireVendorProfile } from './guards';

describe('vendor auth redirects', () => {
  it('uses vendor login only for vendor portal paths', () => {
    expect(endedSessionLoginPath('/pro')).toBe('/vendor/login');
    expect(endedSessionLoginPath('/pro/orders/123?tab=active')).toBe('/vendor/login');
    expect(endedSessionLoginPath('/orders')).toBe(AUTH_ROUTES.login);
    expect(endedSessionLoginPath('/profile')).toBe(AUTH_ROUTES.login);
    expect(isVendorPortalPath('/products')).toBe(false);
    expect(isVendorPortalPath('/profile')).toBe(false);
    expect(isVendorPortalPath('/pro/catalogue')).toBe(true);
  });

  it('keeps admin session redirects on staff login', () => {
    expect(endedSessionLoginPath('/admin')).toBe(AUTH_ROUTES.staffLogin);
    expect(endedSessionLoginPath('/admin/disputes')).toBe(AUTH_ROUTES.staffLogin);
  });

  it('does not redirect when an auth page is already open', () => {
    expect(shouldRedirectForEndedSession('/vendor/login')).toBe(false);
    expect(shouldRedirectForEndedSession('/login')).toBe(false);
    expect(shouldRedirectForEndedSession('/admin/login')).toBe(false);
    expect(shouldRedirectForEndedSession('/pro')).toBe(true);
  });

  it('shows a clear missing-profile state before vendor dashboard providers mount', () => {
    mock.vendorStatus = 'missing';
    const markup = renderToStaticMarkup(createElement(RequireVendorProfile, { children: createElement('div', null, 'dashboard') }));
    expect(markup).toContain('guard.vendorProfileMissing');
    expect(markup).toContain('common:action.signOut');
    expect(markup).not.toContain('dashboard');
  });
});
