import { useTranslation } from 'react-i18next';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { SlidersHorizontalIcon } from 'lucide-react';
import { productCategories } from '../../../../data/productCategories';
import { productCategoryLabel } from '../../../../i18n/labels';
import { Switch } from '../../../../components/Switch';
import { Button } from '../../../../components/ui/Button';
import { Dialog } from '../../../../components/ui/Dialog';
import { field, ok } from '../../../../components/vendor/formStyles';
import { formatNumberInput, parseNumberInput } from '../../../../lib/numberInput';
import { PRICE_INPUT_MAX, PRODUCT_SORTS } from '../../constants';
import type { ProductCategory } from '../../../../types/marketplace';
import type { ProductFilters } from '../../types';

interface ProductFilterBarProps {
  filters: ProductFilters;
  onChange: (next: ProductFilters) => void;
  activeCount: number;
  onClear: () => void;
}

const chip = (active: boolean) =>
`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 ${
active ? 'border-pine bg-pine text-white' : 'border-line bg-white text-ink hover:bg-sand'}`;

const priceText = (n: number | null) => n === null ? '' : formatNumberInput(n);
const toPrice = (raw: string) => {
  const n = parseNumberInput(raw);
  // Blank, not a whole number, or too big: no limit on that side.
  return n === null || !Number.isFinite(n) || n > PRICE_INPUT_MAX ? null : n;
};

/** Price range and "In stock only": inline on wide screens, in the Filters sheet on phones. */
function PriceAndStock({ filters, onChange, onApplied, stacked = false }: {filters: ProductFilters;onChange: (next: ProductFilters) => void;onApplied?: () => void;stacked?: boolean;}) {
  const { t } = useTranslation('discovery');
  const [min, setMin] = useState(priceText(filters.price.min));
  const [max, setMax] = useState(priceText(filters.price.max));
  // Back/Forward or "Clear" change the URL: show what it says.
  useEffect(() => {
    setMin(priceText(filters.price.min));
    setMax(priceText(filters.price.max));
  }, [filters.price.min, filters.price.max]);

  function applyPrice(e: FormEvent) {
    e.preventDefault();
    let lo = toPrice(min);
    let hi = toPrice(max);
    if (lo !== null && hi !== null && hi < lo) [lo, hi] = [hi, lo];
    onChange({ ...filters, price: { min: lo, max: hi } });
    onApplied?.();
  }

  return (
    <div className={stacked ? 'space-y-5' : 'flex flex-wrap items-end gap-x-5 gap-y-3'}>
      <form onSubmit={applyPrice} className="flex items-end gap-2" aria-label={t('products.filters.price')}>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted">{t('products.filters.minPrice')}</span>
          <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} placeholder="₦0" className={`${field} ${ok} ${stacked ? 'w-full' : 'w-28'} py-2`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted">{t('products.filters.maxPrice')}</span>
          <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} placeholder={t('products.filters.any')} className={`${field} ${ok} ${stacked ? 'w-full' : 'w-28'} py-2`} />
        </label>
        <Button type="submit" variant="outline" size="sm">{t('products.filters.apply')}</Button>
      </form>
      <div className="flex items-center gap-2 pb-1.5">
        <Switch checked={filters.inStockOnly} onChange={(inStockOnly) => onChange({ ...filters, inStockOnly })} label={t('products.filters.inStockOnly')} />
        <span className="text-sm font-semibold text-ink" aria-hidden="true">{t('products.filters.inStockOnly')}</span>
      </div>
    </div>);

}

/**
 * The horizontal bar above the product grid: category chips (scrolling sideways), then price, stock and
 * sort. On phones price and stock move into a "Filters" sheet. Every change updates the URL.
 */
export function ProductFilterBar({ filters, onChange, activeCount, onClear }: ProductFilterBarProps) {
  const { t } = useTranslation('discovery');
  const sortId = useId();
  const [sheetOpen, setSheetOpen] = useState(false);
  const setCategory = (category: ProductCategory | null) => onChange({ ...filters, category });
  // The sheet holds price and stock only, so the badge counts just those.
  const sheetCount = Number(filters.price.min !== null || filters.price.max !== null) + Number(filters.inStockOnly);

  return (
    <div className="space-y-3 border-y border-line py-3">
      <div role="group" aria-label={t('products.filters.category')} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:-mx-1 lg:px-1">
        <button type="button" aria-pressed={filters.category === null} onClick={() => setCategory(null)} className={chip(filters.category === null)}>
          {t('products.filters.allCategories')}
        </button>
        {productCategories.map((c) =>
        <button key={c.id} type="button" aria-pressed={filters.category === c.id} onClick={() => setCategory(c.id)} className={chip(filters.category === c.id)}>
            {productCategoryLabel(c.id, c.label)}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
        <div className="hidden md:block">
          <PriceAndStock filters={filters} onChange={onChange} />
        </div>
        <Button variant="outline" size="sm" icon={SlidersHorizontalIcon} onClick={() => setSheetOpen(true)} aria-haspopup="dialog" className="md:hidden">
          {sheetCount > 0 ? t('products.filters.buttonCount', { count: sheetCount }) : t('products.filters.button')}
        </Button>

        <div className="ml-auto flex items-center gap-3">
          {activeCount > 0 &&
          <Button variant="ghost" size="sm" onClick={onClear}>
              {t('products.filters.clear', { count: activeCount })}
            </Button>
          }
          <div className="flex items-center gap-2">
            <label htmlFor={sortId} className="whitespace-nowrap text-sm font-semibold text-muted">{t('sort.label')}</label>
            <select
              id={sortId}
              value={filters.sort}
              onChange={(e) => onChange({ ...filters, sort: PRODUCT_SORTS.find((s) => s === e.target.value) ?? filters.sort })}
              className="rounded-lg border border-line bg-white px-2.5 py-2 text-sm font-semibold text-ink focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20">

              {PRODUCT_SORTS.map((s) =>
              <option key={s} value={s}>{t(`products.sort.${s}`)}</option>
              )}
            </select>
          </div>
        </div>
      </div>

      <Dialog open={sheetOpen} onClose={() => setSheetOpen(false)} title={t('products.filters.button')} variant="sheet">
        <PriceAndStock filters={filters} onChange={onChange} onApplied={() => setSheetOpen(false)} stacked />
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={() => setSheetOpen(false)}>{t('products.filters.done')}</Button>
        </div>
      </Dialog>
    </div>);

}
