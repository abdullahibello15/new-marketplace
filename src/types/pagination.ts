/** One page of a paginated API response. Pages are 1-based. */
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}
