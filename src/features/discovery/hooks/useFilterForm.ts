import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FILTER_APPLY_DEBOUNCE_MS } from '../constants';
import { filterFormSchema, type FilterFormData, type FilterFormValues } from '../schemas';
import { clearFilters, filtersToForm, formToFilters } from '../utils/searchFilters';
import type { SearchFilters } from '../types';

interface UseFilterFormOptions {
  /** The applied filters (from the URL). */
  filters: SearchFilters;
  onApply: (next: SearchFilters) => void;
  /** Desktop: apply automatically after a short pause. Phone sheet: wait for the Apply button. */
  autoApply: boolean;
}

/** Compares form values regardless of key order. */
const formKey = (v: FilterFormValues) => JSON.stringify([v.categories, v.tiers, v.areaMode, v.radiusKm, v.lgas, v.priceMin, v.priceMax]);

/** A draft copy of the filters in a validated form (React Hook Form + Zod). */
export function useFilterForm({ filters, onApply, autoApply }: UseFilterFormOptions) {
  const form = useForm<FilterFormValues, unknown, FilterFormData>({
    resolver: zodResolver(filterFormSchema),
    defaultValues: filtersToForm(filters),
    mode: 'onChange'
  });

  const latest = useRef({ filters, onApply });
  latest.current = { filters, onApply };
  const lastApplied = useRef<string | null>(null);

  const apply = form.handleSubmit((data) => {
    lastApplied.current = formKey(form.getValues());
    latest.current.onApply(formToFilters(data, latest.current.filters));
  });
  const applyRef = useRef(apply);
  applyRef.current = apply;

  // When the URL changes from elsewhere (a chip removed, Back pressed), show those filters.
  // Skip the echo of our own apply so it can't overwrite what the user is still typing.
  const urlKey = formKey(filtersToForm(filters));
  useEffect(() => {
    if (urlKey === lastApplied.current || urlKey === formKey(form.getValues())) return;
    form.reset(filtersToForm(latest.current.filters));
  }, [urlKey, form]);

  useEffect(() => {
    if (!autoApply) return;
    let timer: number | undefined;
    const subscription = form.watch((_values, { name }) => {
      // `name` is empty for reset(), which shouldn't trigger a search.
      if (!name) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void applyRef.current(), FILTER_APPLY_DEBOUNCE_MS);
    });
    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [autoApply, form]);

  return {
    form,
    apply,
    /** Resets the draft to no filters (keeps the search text and sort). */
    clearDraft: () => form.reset(filtersToForm(clearFilters(latest.current.filters)))
  };
}
