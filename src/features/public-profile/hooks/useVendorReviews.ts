import { useCallback, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { usePaginatedList } from '../../../hooks/usePaginatedList';
import { REVIEW_SORT } from '../constants';
import { getReviewSummary, listVendorReviews } from '../services/publicProfileService';
import type { ReviewSort } from '../types';

/** Rating summary plus a sorted, "Load more" list of reviews. */
export function useVendorReviews(vendorId: string) {
  const [sort, setSort] = useState<ReviewSort>(REVIEW_SORT.Newest);

  const loadSummary = useCallback(() => getReviewSummary(vendorId), [vendorId]);
  const summary = useAsyncData(loadSummary);

  const fetchPage = useCallback((page: number) => listVendorReviews(vendorId, { sort, page }), [vendorId, sort]);
  const list = usePaginatedList(fetchPage);

  return { summary, list, sort, setSort };
}
