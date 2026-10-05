import { findTradeCategory } from '../../../data/tradeCategories';
import { SUGGESTION_GROUP } from '../constants';
import type { RecentSearch, SuggestionOption, SuggestionResults } from '../types';

/** Flattens grouped results into one ordered list, so arrow keys can move straight through every group. */
export function toSuggestionOptions(results: SuggestionResults): SuggestionOption[] {
  return [
  ...results.categories.map((c): SuggestionOption => ({
    id: `category-${c.id}`,
    group: SUGGESTION_GROUP.Categories,
    label: c.label,
    detail: 'Category',
    target: { kind: 'category', category: c.id }
  })),
  ...results.services.map((s, i): SuggestionOption => ({
    id: `service-${i}`,
    group: SUGGESTION_GROUP.Services,
    label: s.name,
    detail: findTradeCategory(s.category)?.browseLabel,
    target: { kind: 'query', query: s.name }
  })),
  ...results.vendors.map((v): SuggestionOption => ({
    id: `vendor-${v.id}`,
    group: SUGGESTION_GROUP.Vendors,
    label: v.name,
    detail: `${v.tradeLabel} · ${v.area}`,
    target: { kind: 'query', query: v.name }
  }))];

}

export function toRecentOptions(recent: RecentSearch[]): SuggestionOption[] {
  return recent.map((r, i) => ({
    id: `recent-${i}`,
    group: SUGGESTION_GROUP.Recent,
    label: r.label,
    detail: r.target.kind === 'category' ? 'Category' : undefined,
    target: r.target
  }));
}
