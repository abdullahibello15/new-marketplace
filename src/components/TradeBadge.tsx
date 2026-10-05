import { formatTrade } from '../utils/format';
import type { VendorProfileInput } from '../types/marketplace';

export function TradeBadge({ trade }: {trade: VendorProfileInput;}) {
  return (
    <span className="inline-flex max-w-full items-center truncate whitespace-nowrap rounded-md bg-sand px-2 py-0.5 text-xs font-bold text-ink">
      {formatTrade(trade)}
    </span>);

}
