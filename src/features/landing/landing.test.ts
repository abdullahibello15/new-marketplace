import { describe, expect, it } from 'vitest';
import { isPublicPath } from '../auth/config';
import { AUTH_ROUTES } from '../auth/constants';
import { parseFilters } from '../discovery/utils/searchFilters';
import { LANDING_NAV, LANDING_SECTION } from './constants';
import { landingSearchUrl } from './utils/searchLink';

describe('landing page', () => {
  it('is public, and so is the staff login, even while login is required', () => {
    expect(isPublicPath(AUTH_ROUTES.about)).toBe(true);
    expect(isPublicPath(AUTH_ROUTES.staffLogin)).toBe(true);
    expect(isPublicPath('/search')).toBe(false);
  });

  it('turns the hero search into the results URL a visitor sees after signing up', () => {
    const url = landingSearchUrl('plumber', 'Bosso');
    const filters = parseFilters(new URLSearchParams(url.split('?')[1] ?? ''));
    expect(url.startsWith('/search')).toBe(true);
    expect(filters.categories).toEqual(['plumber']);
    expect(filters.area).toEqual({ mode: 'lga', lgas: ['Bosso'] });
    expect(landingSearchUrl('', '')).toBe('/search');
  });

  it('links every header item to a section on the page', () => {
    const ids = Object.values(LANDING_SECTION);
    expect(LANDING_NAV.map((n) => n.id).sort()).toEqual([...ids].sort());
  });
});

describe('landing highlights', () => {
  it('counts from the app data and keeps services and shops apart', async () => {
    const { getAllVendors } = await import('../../services/vendorStore');
    const { getLandingHighlights } = await import('./services/landingService');
    const h = await getLandingHighlights();
    const vendors = getAllVendors();
    expect(h.stats.providers).toBeLessThanOrEqual(vendors.length);
    expect(h.stats.reviews).toBeGreaterThan(0);
    expect(h.stats.lgas).toBe(25);
    expect(h.featured.service.every((v) => v.kind === 'service')).toBe(true);
    expect(h.featured.retail.every((v) => v.kind === 'retail')).toBe(true);
    expect(h.testimonials.every((r) => r.comment.length >= 40)).toBe(true);
    const counted = Object.values(h.categoryCounts).reduce((s, n) => s + (n ?? 0), 0);
    expect(counted).toBe(h.stats.providers);
  });
});
