import { completenessLabel } from '../../utils/completeness';
import type { CompletenessLabel } from '../../types';

const TONE: Record<CompletenessLabel, string> = {
  gettingStarted: 'text-clay',
  good: 'text-mustard-dark',
  almostThere: 'text-pine',
  complete: 'text-pine'
};

interface CompletenessRingProps {
  score: number;
  /** Diameter in px. */
  size?: number;
  /** Accessible name, e.g. "Profile 72% complete". */
  label: string;
  /** Show the percentage inside the ring (off for the tiny nav version). */
  showValue?: boolean;
}

/** A progress ring for the completeness score, coloured by its band. */
export function CompletenessRing({ score, size = 72, label, showValue = true }: CompletenessRingProps) {
  const stroke = Math.max(3, Math.round(size / 10));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const value = Math.min(100, Math.max(0, score));
  return (
    <div role="img" aria-label={label} className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-current text-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          className={`stroke-current transition-[stroke-dashoffset] duration-500 ease-out ${TONE[completenessLabel(value)]}`} />

      </svg>
      {showValue && <span aria-hidden="true" className="absolute text-sm font-bold tabular-nums text-ink">{value}%</span>}
    </div>);

}
