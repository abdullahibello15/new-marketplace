import type { StockFilterOption } from '../types/marketplace';

export const stockFilters: StockFilterOption[] = [
{ id: 'all', label: 'All', emptyTitle: 'No products match', emptyHint: 'Try a different word or category.' },
{
  id: 'low_stock',
  label: 'Low stock',
  emptyTitle: 'Nothing is running low',
  emptyHint: 'Products show here when stock drops to their low-stock level.'
},
{
  id: 'out_of_stock',
  label: 'Out of stock',
  emptyTitle: 'Nothing is out of stock',
  emptyHint: 'Products with 0 in stock show here. Customers can’t order them.'
}];
