import { PriceRange } from './ui/PriceRange';
import type { ServiceItem } from '../types/vendorPortal';

export function ServicePriceList({ services }: {services: ServiceItem[];}) {
  if (services.length === 0) return null;

  return (
    <section aria-labelledby="services-heading">
      <h2 id="services-heading" className="text-xs font-bold uppercase tracking-wider text-muted">Services & prices</h2>
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {services.map((s) =>
        <li key={s.id} className="flex items-start justify-between gap-4 px-4 py-3.5 lg:px-5">
            <div className="min-w-0">
              <p className="font-bold text-ink">
                {s.name}
                <span className="sr-only">:</span>
              </p>
              {s.description && <p className="mt-0.5 text-sm text-muted">{s.description}</p>}
            </div>
            <p className="shrink-0 whitespace-nowrap text-right font-bold text-ink">
              <PriceRange min={s.minPrice} max={s.maxPrice} />
            </p>
          </li>
        )}
      </ul>
    </section>);

}
