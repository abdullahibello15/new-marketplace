import { Link } from 'react-router-dom';
import { ImageOffIcon, SquarePenIcon, Trash2Icon } from 'lucide-react';
import { StockStepper } from './StockStepper';
import { StockBadge } from '../StockBadge';
import { Switch } from '../Switch';
import { formatNaira } from '../../utils/format';
import { categoryLabel } from '../../utils/products';
import type { Product } from '../../types/marketplace';

interface ProductListItemProps {
  product: Product;
  onToggleAvailable: (available: boolean) => void;
  onStockChange: (stock: number) => void;
  onDelete: () => void;
}

export function ProductListItem({ product: p, onToggleAvailable, onStockChange, onDelete }: ProductListItemProps) {
  const needsPhoto = p.images.length === 0;
  const editTo = `/pro/catalogue/products/${p.id}`;

  return (
    <li className="flex gap-4 rounded-2xl border border-line bg-white p-4">
      {needsPhoto ?
      <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-sand text-muted" aria-hidden="true">
          <ImageOffIcon className="h-6 w-6" />
        </span> :

      <img src={p.images[0]} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
      }
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1">
            <Link
              to={editTo}
              className="line-clamp-2 rounded text-base font-bold text-ink hover:text-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

              {p.name}
            </Link>
          </h3>
          <Link
            to={editTo}
            aria-label={`Edit ${p.name}`}
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-sand hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

            <SquarePenIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${p.name}`}
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-clay-soft hover:text-clay-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

            <Trash2Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          <span className="font-bold text-ink">{formatNaira(p.price)}</span> · {categoryLabel(p.category)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <StockStepper value={p.stock} onChange={onStockChange} productName={p.name} />
          <StockBadge product={p} />
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2">
          <Switch
            checked={p.available}
            onChange={onToggleAvailable}
            label={`${p.name} available to buy`}
            disabled={needsPhoto}
            describedBy={needsPhoto ? `${p.id}-needs-photo` : undefined} />

          <span className="text-sm font-semibold text-ink">{p.available ? 'Available' : 'Hidden'}</span>
          {needsPhoto &&
          <span id={`${p.id}-needs-photo`} className="rounded-md bg-clay-soft px-2 py-0.5 text-xs font-bold text-clay-dark">
              Add a photo to show it
            </span>
          }
        </div>
      </div>
    </li>);

}
