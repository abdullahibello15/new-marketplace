import { useId } from 'react';
import { StarIcon } from 'lucide-react';

const LEVELS = [1, 2, 3, 4, 5] as const;
const WORDS = ['Terrible', 'Poor', 'Okay', 'Good', 'Excellent'];

interface StarRatingInputProps {
  value: number | null;
  onChange: (value: number) => void;
  label: string;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Pick 1–5 stars. Built on native radio buttons, so arrow keys move between stars and screen readers
 * announce "4 stars, Good". Pairs with the read-only StarRating.
 */
export function StarRatingInput({ value, onChange, label, invalid = false, describedBy }: StarRatingInputProps) {
  const name = useId();
  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="mb-1.5 block text-sm font-bold text-muted">{label}</legend>
      <div className="flex items-center gap-1">
        {LEVELS.map((level) => {
          const filled = value !== null && level <= value;
          return (
            <label key={level} className="cursor-pointer rounded-lg p-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine/40">
              <input
                type="radio"
                name={name}
                value={level}
                checked={value === level}
                onChange={() => onChange(level)}
                aria-invalid={invalid || undefined}
                className="sr-only" />

              <StarIcon className={`h-8 w-8 transition-colors duration-150 ${filled ? 'text-mustard' : 'text-line hover:text-mustard/60'}`} fill="currentColor" aria-hidden="true" />
              <span className="sr-only">
                {level} {level === 1 ? 'star' : 'stars'}, {WORDS[level - 1]}
              </span>
            </label>);

        })}
        {value !== null && <span className="ml-2 text-sm font-semibold text-ink">{WORDS[value - 1]}</span>}
      </div>
    </fieldset>);

}
