interface DualRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  /** Accessible names for the two thumbs, e.g. "Minimum price". */
  lowLabel: string;
  highLabel: string;
  /** Spoken value for each thumb, e.g. "₦5,000" instead of a raw index. */
  formatValue?: (value: number, thumb: 'low' | 'high') => string;
}

// Two native range inputs stacked on one track. Only the thumbs take pointer events, so either can be dragged,
// and each stays a real slider for keyboards and screen readers.
const thumbInput =
'pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent focus:outline-none ' +
'[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-pine [&::-webkit-slider-thumb]:shadow ' +
'[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-pine [&::-moz-range-track]:bg-transparent ' +
'[&:focus-visible::-webkit-slider-thumb]:ring-4 [&:focus-visible::-webkit-slider-thumb]:ring-pine/30 [&:focus-visible::-moz-range-thumb]:ring-4 [&:focus-visible::-moz-range-thumb]:ring-pine/30';

export function DualRangeSlider({ min, max, step = 1, low, high, onChange, lowLabel, highLabel, formatValue = (value) => String(value) }: DualRangeSliderProps) {
  const span = max - min || 1;
  const lowPct = (low - min) / span * 100;
  const highPct = (high - min) / span * 100;
  // When both thumbs sit at the top end, the low thumb must be on top or it can never be dragged back down.
  const lowOnTop = low > min + span / 2;

  return (
    <div className="relative h-6">
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line" aria-hidden="true" />
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-pine"
        style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }}
        aria-hidden="true" />

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={low}
        onChange={(e) => onChange(Math.min(Number(e.target.value), high), high)}
        aria-label={lowLabel}
        aria-valuetext={formatValue(low, 'low')}
        className={`${thumbInput} ${lowOnTop ? 'z-20' : 'z-10'}`} />

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={high}
        onChange={(e) => onChange(low, Math.max(Number(e.target.value), low))}
        aria-label={highLabel}
        aria-valuetext={formatValue(high, 'high')}
        className={`${thumbInput} ${lowOnTop ? 'z-10' : 'z-20'}`} />

    </div>);

}
