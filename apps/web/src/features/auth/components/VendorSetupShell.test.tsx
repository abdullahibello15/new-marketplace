import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLE } from '../constants';

const state = vi.hoisted(() => ({ user: null as {roles: string[];} | null }));

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../components/AppShell', () => ({
  AppShell: ({ navItems, homeTo }: {navItems: unknown[];homeTo: string;}) =>
    createElement('div', { 'data-layout': 'vendor', 'data-nav-count': navItems.length, 'data-home': homeTo })
}));
vi.mock('./AuthLayout', () => ({
  AuthLayout: () => createElement('div', { 'data-layout': 'account' })
}));

import { VendorSetupShell } from '../../../components/VendorSetupShell';

describe('VendorSetupShell', () => {
  beforeEach(() => { state.user = null; });

  it('renders the vendor shell only for a signed-in provider and leaves vendor nav unavailable', () => {
    state.user = { roles: [ROLE.Provider] };
    const markup = renderToStaticMarkup(createElement(VendorSetupShell));
    expect(markup).toContain('data-layout="vendor"');
    expect(markup).toContain('data-nav-count="0"');
    expect(markup).toContain('data-home="/account/vendor-setup"');
  });

  it.each([ROLE.Customer, ROLE.Admin])('keeps the account layout for %s users', (role) => {
    state.user = { roles: [role] };
    expect(renderToStaticMarkup(createElement(VendorSetupShell))).toContain('data-layout="account"');
  });

  it('renders nothing without a signed-in user', () => {
    expect(renderToStaticMarkup(createElement(VendorSetupShell))).toBe('');
  });
});
