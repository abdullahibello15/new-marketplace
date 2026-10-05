/**
 * The one font treatment for Naira amounts: Tailwind's monospace stack with tabular figures, so digits
 * line up in columns ("₦5,000" sits exactly under "₦15,000"). Use <Price>/<PriceRange> rather than
 * this class directly where possible.
 */
export const MONEY_CLASS = 'font-mono tabular-nums tracking-tight';
