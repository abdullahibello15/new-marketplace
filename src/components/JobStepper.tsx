import React from 'react';
import { jobStages } from '../data/jobStages';
import type { JobStage } from '../types/marketplace';

export function JobStepper({ stage }: {stage: JobStage;}) {
  const currentIndex = jobStages.findIndex((s) => s.id === stage);
  const isFinished = stage === 'completed';

  return (
    <ol className="grid grid-cols-5" aria-label="Job progress">
      {jobStages.map((s, i) => {
        const done = i < currentIndex || isFinished;
        const current = i === currentIndex && !isFinished;
        return (
          <li key={s.id} className="relative flex flex-col items-center" aria-current={current ? 'step' : undefined}>
            {i > 0 &&
            <span
              aria-hidden="true"
              className={`absolute right-1/2 top-[11px] h-0.5 w-full ${i <= currentIndex ? 'bg-clay' : 'bg-line'}`} />

            }
            <span className="relative z-10 flex h-6 w-6 items-center justify-center" aria-hidden="true">
              <span
                className={
                current ?
                'h-5 w-5 rounded-full bg-mustard ring-4 ring-mustard/30' :
                done ?
                'h-3.5 w-3.5 rounded-full bg-clay' :
                'h-3.5 w-3.5 rounded-full bg-line'
                } />
              
            </span>
            <span
              className={`mt-2 whitespace-nowrap text-[11px] sm:text-xs ${current ? 'font-bold text-ink' : 'font-medium text-muted'}`}>
              
              {s.label}
            </span>
            <span className="sr-only">{done ? ', done' : current ? ', current step' : ', upcoming'}</span>
          </li>);

      })}
    </ol>);

}