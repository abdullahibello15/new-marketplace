// Moved to packages/domain (@zamani/domain); this path keeps working. The badge styling (UI) stays here.
import { JOB_STATUS_META as JOB_STATUS_META_TEXT } from '@zamani/domain/features/jobs/constants';
import type { JobStatus } from './types';
export * from '@zamani/domain/features/jobs/constants';

/** Badge styling per value (UI only); the labels come from @zamani/domain. */
const JOB_STATUS_META_UI: Record<JobStatus, {badgeClass: string;dotClass: string;}> = {
  requested: { badgeClass: 'bg-[#E4EAF3] text-[#2B4A7A]', dotClass: 'bg-[#2B4A7A]' },
  quoted: { badgeClass: 'bg-[#F7EBCB] text-mustard-dark', dotClass: 'bg-mustard-dark' },
  scheduled: { badgeClass: 'bg-[#E3EEEC] text-pine', dotClass: 'bg-pine' },
  in_progress: { badgeClass: 'bg-[#EDE6F5] text-[#5B3E8A]', dotClass: 'bg-[#5B3E8A]' },
  awaiting_confirmation: { badgeClass: 'bg-[#FFE8CC] text-[#8A4B00]', dotClass: 'bg-[#8A4B00]' },
  completed: { badgeClass: 'bg-pine text-white', dotClass: 'bg-white' },
  closed: { badgeClass: 'bg-[#DCD6CA] text-ink', dotClass: 'bg-ink' },
  declined: { badgeClass: 'bg-clay-soft text-clay-dark', dotClass: 'bg-clay-dark' },
  quote_rejected: { badgeClass: 'bg-[#F9E3EE] text-[#9D2E63]', dotClass: 'bg-[#9D2E63]' },
  cancelled: { badgeClass: 'bg-sand text-muted', dotClass: 'bg-muted' },
  disputed: { badgeClass: 'bg-[#8F3916] text-white', dotClass: 'bg-white' }
};

export const JOB_STATUS_META: Record<JobStatus, {label: string;badgeClass: string;dotClass: string;description: string;}> = Object.fromEntries(
  (Object.keys(JOB_STATUS_META_TEXT) as JobStatus[]).map((s) => {
    const ui = JOB_STATUS_META_UI[s];
    return [s, { label: JOB_STATUS_META_TEXT[s].label, badgeClass: ui.badgeClass, dotClass: ui.dotClass, description: JOB_STATUS_META_TEXT[s].description }];
  })
) as Record<JobStatus, {label: string;badgeClass: string;dotClass: string;description: string;}>;
