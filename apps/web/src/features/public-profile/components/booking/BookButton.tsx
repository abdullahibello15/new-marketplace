import { useId } from 'react';
import { CalendarPlusIcon, SendIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import type { CategoryKind } from '../../../../types/marketplace';

interface BookButtonProps {
  kind: CategoryKind;
  label: string;
  /** Why booking is off right now; disables the button and is shown underneath. */
  blockedReason: string | null;
  onClick: () => void;
  /** The header is dark pine; the phone bar is white. */
  tone: 'onDark' | 'onLight';
}

export function BookButton({ kind, label, blockedReason, onClick, tone }: BookButtonProps) {
  const reasonId = useId();
  return (
    <div>
      <Button
        variant={tone === 'onDark' ? 'highlight' : 'accent'}
        icon={kind === 'retail' ? SendIcon : CalendarPlusIcon}
        onClick={onClick}
        disabled={blockedReason !== null}
        aria-describedby={blockedReason ? reasonId : undefined}
        fullWidth>

        {label}
      </Button>
      {blockedReason &&
      <p id={reasonId} className={`mt-2 text-sm font-semibold ${tone === 'onDark' ? 'text-white/85' : 'text-clay-dark'}`}>
          {blockedReason}
        </p>
      }
    </div>);

}
