import type { JobStageInfo } from '../types/marketplace';

export const jobStages: JobStageInfo[] = [
{ id: 'requested', label: 'Requested', badgeClass: 'bg-sand text-muted' },
{ id: 'quoted', label: 'Quoted', badgeClass: 'bg-clay-soft text-clay-dark' },
{ id: 'accepted', label: 'Accepted', badgeClass: 'bg-[#F7EBCB] text-mustard-dark' },
{ id: 'in_progress', label: 'In progress', badgeClass: 'bg-[#E3EEEC] text-pine' },
{ id: 'completed', label: 'Completed', badgeClass: 'bg-pine text-white' }];