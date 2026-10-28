import { formatNaira } from '../../utils/format';
import { MONEY_CLASS } from './moneyStyles';

/** A single Naira amount, e.g. "₦5,000", in the shared money font. */
export function Price({ amount, className = '' }: {amount: number;className?: string;}) {
  return <span className={`${MONEY_CLASS} ${className}`}>{formatNaira(amount)}</span>;
}
