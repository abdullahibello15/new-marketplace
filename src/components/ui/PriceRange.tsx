import { formatPriceRange } from '../../utils/format';
import { MONEY_CLASS } from './moneyStyles';

interface PriceRangeProps {
  min: number;
  max: number;
  className?: string;
}

/** "₦5,000 – ₦15,000" (or one price when min equals max) in the shared money font. */
export function PriceRange({ min, max, className = '' }: PriceRangeProps) {
  return <span className={`${MONEY_CLASS} ${className}`}>{formatPriceRange(min, max)}</span>;
}
