import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './returnPath';

describe('safeReturnPath', () => {
  it('keeps paths inside the app, with their query and hash', () => {
    expect(safeReturnPath('/checkout')).toBe('/checkout');
    expect(safeReturnPath('/pay/order/ORD-1?method=card#top')).toBe('/pay/order/ORD-1?method=card#top');
    expect(safeReturnPath('/welcome')).toBe('/welcome');
  });

  it('refuses other sites and anything that is not a path', () => {
    for (const from of ['//evil.com', 'https://evil.com', '/\\evil.com', 'evil.com', '', '/\tfoo', undefined, null, 42, { from: '/x' }]) {
      expect(safeReturnPath(from)).toBeUndefined();
    }
  });

  // React Router 6 can turn a backslash in <Link to> / navigate() into another host (GHSA-wrjc-x8rr-h8h6),
  // and has no 6.x fix. This guard is what keeps the post-sign-in redirect safe until the v7 upgrade.
  it('refuses backslash and protocol-relative paths that could reach another host', () => {
    for (const from of ['\\evil.com', '//evil.com', '/\\evil.com', '\\\\evil.com', '/\\/evil.com', '//\\evil.com', '/checkout\\..\\evil.com']) {
      expect(safeReturnPath(from), JSON.stringify(from)).toBeUndefined();
    }
  });

  it('refuses sign-in pages, which would loop', () => {
    expect(safeReturnPath('/login')).toBeUndefined();
    expect(safeReturnPath('/login/forgot')).toBeUndefined();
    expect(safeReturnPath('/signup/customer')).toBeUndefined();
    expect(safeReturnPath('/admin/login')).toBeUndefined();
    expect(safeReturnPath('/loginx')).toBe('/loginx');
  });
});
