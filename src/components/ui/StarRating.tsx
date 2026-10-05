import { StarIcon } from 'lucide-react';

const MAX_STARS = 5;

interface StarRatingProps {
  /** 0–5; fractions round to the nearest half for display. */
  value: number;
  size?: 'sm' | 'md';
}

/** Read-only star display. Announced as "4.5 out of 5 stars". */
export function StarRating({ value, size = 'sm' }: StarRatingProps) {
  const rounded = Math.round(value * 2) / 2;
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <span role="img" aria-label={`${rounded} out of ${MAX_STARS} stars`} className="inline-flex items-center gap-0.5">
      {Array.from({ length: MAX_STARS }, (_, i) => {
        const fill = Math.min(1, Math.max(0, rounded - i));
        return (
          <span key={i} className={`relative ${icon}`} aria-hidden="true">
            <StarIcon className={`absolute inset-0 ${icon} text-line`} fill="currentColor" />
            {fill > 0 &&
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <StarIcon className={`${icon} text-mustard`} fill="currentColor" />
              </span>
            }
          </span>);

      })}
    </span>);

}
