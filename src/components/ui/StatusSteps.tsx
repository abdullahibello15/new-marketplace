import { format } from 'date-fns';
import { CheckIcon, XIcon } from 'lucide-react';

export type StepState = 'done' | 'current' | 'upcoming' | 'stopped';

export interface StatusStep {
  key: string;
  label: string;
  state: StepState;
  /** ISO time the step was reached, if it was. */
  at: string | null;
}

const DOT: Record<StepState, string> = {
  done: 'bg-pine text-white',
  current: 'bg-mustard text-ink ring-4 ring-mustard/30',
  upcoming: 'bg-line text-muted',
  stopped: 'bg-clay-dark text-white'
};

/**
 * A progress trail: done steps ticked, the current one highlighted, and a crossed-out step where a
 * flow stopped early. Vertical on phones, horizontal from tablet up. Shared by jobs and orders.
 */
export function StatusSteps({ steps, label, stoppedText = 'ended here' }: {steps: StatusStep[];label: string;stoppedText?: string;}) {
  const spoken: Record<StepState, string> = { done: 'done', current: 'current step', upcoming: 'not yet', stopped: stoppedText };
  return (
    <ol aria-label={label} className="flex flex-col gap-3 sm:grid sm:gap-0" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, i) =>
      <li
        key={step.key}
        aria-current={step.state === 'current' ? 'step' : undefined}
        className="relative flex items-center gap-3 sm:flex-col sm:gap-2 sm:text-center">

          {i > 0 &&
        <span
          aria-hidden="true"
          className={`absolute hidden h-0.5 sm:right-1/2 sm:top-3 sm:block sm:w-full ${
          step.state === 'upcoming' ? 'bg-line' : step.state === 'stopped' ? 'bg-clay-dark' : 'bg-pine'}`} />

        }
          <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${DOT[step.state]}`} aria-hidden="true">
            {step.state === 'done' ?
          <CheckIcon className="h-3.5 w-3.5" /> :
          step.state === 'stopped' ?
          <XIcon className="h-3.5 w-3.5" /> :

          i + 1
          }
          </span>
          <span className="min-w-0">
            <span className={`block text-sm sm:text-xs ${step.state === 'upcoming' ? 'font-medium text-muted' : 'font-bold text-ink'}`}>{step.label}</span>
            {step.at && <span className="block text-xs text-muted">{format(new Date(step.at), 'd MMM')}</span>}
            <span className="sr-only">, {spoken[step.state]}</span>
          </span>
        </li>
      )}
    </ol>);

}
