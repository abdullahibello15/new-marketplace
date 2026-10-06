import { useState } from 'react';
import { CheckCircle2Icon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { AUTO_CONFIRM_HOURS } from '../../../jobs/constants';
import type { Job } from '../../../jobs/types';

/** Task 55 (vendor side): "Mark work done" hands the job to the customer to confirm. */
export function MarkDoneCard({ job, busy, onDone }: {job: Job;busy: boolean;onDone: () => Promise<boolean>;}) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="mark-done-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <h2 id="mark-done-heading" className="text-base font-bold text-ink">Finished the work?</h2>
      <p className="mt-0.5 text-sm text-muted">{job.customerName} will be asked to confirm. If they don’t reply within {AUTO_CONFIRM_HOURS} hours, it’s confirmed automatically.</p>
      <Button icon={CheckCircle2Icon} fullWidth className="mt-3" onClick={() => setOpen(true)}>
        Mark work done
      </Button>
      <ConfirmDialog
        open={open}
        title="Mark the work as done?"
        description="Only do this once everything is finished and tested. You can’t go back to In progress."
        confirmLabel="Yes, it’s done"
        loading={busy}
        onConfirm={async () => {
          if (await onDone()) setOpen(false);
        }}
        onCancel={() => setOpen(false)} />

    </section>);

}
