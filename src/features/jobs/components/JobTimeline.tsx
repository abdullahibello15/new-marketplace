import { format } from 'date-fns';
import { CheckIcon, XIcon } from 'lucide-react';
import { JOB_MAIN_PATH, JOB_SIDE_BRANCHES, JOB_STATUS_META } from '../constants';
import { lastMainPathStatus } from '../stateMachine';
import { RescheduleHistory } from './reschedule/RescheduleHistory';
import type { Job, JobStatus } from '../types';

type StepState = 'done' | 'current' | 'upcoming' | 'stopped';

interface Step {
  status: JobStatus;
  state: StepState;
  at: string | null;
}

/** Main path up to where the job is (or where it left the path), then the side-branch end if there is one. */
function buildSteps(job: Pick<Job, 'status' | 'history'>): Step[] {
  const reachedAt = (s: JobStatus) => [...job.history].reverse().find((h) => h.status === s)?.at ?? null;
  const branched = JOB_SIDE_BRANCHES.includes(job.status);
  const lastOnPath = branched ? lastMainPathStatus(job) : job.status;
  const lastIndex = JOB_MAIN_PATH.indexOf(lastOnPath);

  const path: Step[] = JOB_MAIN_PATH.map((status, i) => ({
    status,
    at: i <= lastIndex ? reachedAt(status) : null,
    state: i < lastIndex || i === lastIndex && branched ? 'done' : i === lastIndex ? 'current' : 'upcoming'
  }));
  if (!branched) return path;
  // Show the steps it did reach, then where it stopped; the rest of the path no longer applies.
  return [...path.slice(0, lastIndex + 1), { status: job.status, state: 'stopped', at: reachedAt(job.status) }];
}

const DOT: Record<StepState, string> = {
  done: 'bg-pine text-white',
  current: 'bg-mustard text-ink ring-4 ring-mustard/30',
  upcoming: 'bg-line text-muted',
  stopped: 'bg-clay-dark text-white'
};

const SPOKEN: Record<StepState, string> = { done: 'done', current: 'current step', upcoming: 'not yet', stopped: 'job ended here' };

/**
 * The job's progress: Requested → … → Closed, with the current step highlighted. Vertical on phones,
 * horizontal from tablet up. Shared by the customer's job page and the vendor's request page.
 */
export function JobTimeline({ job }: {job: Pick<Job, 'status' | 'history' | 'reschedules' | 'customerName' | 'vendorName'>;}) {
  const steps = buildSteps(job);
  return (
    <>
    <ol aria-label="Job progress" className="flex flex-col gap-3 sm:grid sm:gap-0" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, i) =>
      <li
        key={step.status}
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
            <span className={`block text-sm sm:text-xs ${step.state === 'upcoming' ? 'font-medium text-muted' : 'font-bold text-ink'}`}>
              {JOB_STATUS_META[step.status].label}
            </span>
            {step.at && <span className="block text-xs text-muted">{format(new Date(step.at), 'd MMM')}</span>}
            <span className="sr-only">, {SPOKEN[step.state]}</span>
          </span>
        </li>
      )}
    </ol>
    <RescheduleHistory job={job} />
    </>);

}
