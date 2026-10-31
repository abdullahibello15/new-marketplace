import { describe, expect, it } from 'vitest';
import { AUTH_ROUTES, ROLE } from '../constants';
import { endedSessionLoginPath, isVendorPortalPath, shouldRedirectForEndedSession, vendorSetupRedirect } from './guards';

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

  it('sends a provider without a vendor profile to setup', () => {
    expect(vendorSetupRedirect({ roles: [ROLE.Provider], vendorId: null })).toBe(AUTH_ROUTES.vendorSetup);
    expect(vendorSetupRedirect({ roles: [ROLE.Provider], vendorId: 'vendor-1' })).toBeNull();
    expect(vendorSetupRedirect({ roles: [ROLE.Customer], vendorId: null })).toBeNull();
    expect(vendorSetupRedirect(null)).toBeNull();
  });
});
