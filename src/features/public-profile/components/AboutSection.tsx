import { BriefcaseIcon, MapPinIcon, MapPinnedIcon } from 'lucide-react';
import { WorkingHoursCard } from '../../../components/WorkingHoursCard';
import { PROFILE_SECTION_ID } from '../constants';
import { PageSection } from './PageSection';
import type { Vendor } from '../../../types/marketplace';

export function AboutSection({ vendor }: {vendor: Vendor;}) {
  return (
    <PageSection id={PROFILE_SECTION_ID.About} title="About">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-2xl border border-line bg-white p-4 lg:p-5">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{vendor.bio || vendor.about}</p>
          <ul className="mt-4 space-y-1.5 text-sm text-muted">
            <li className="flex items-center gap-2">
              <BriefcaseIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-semibold text-ink">{vendor.yearsExperience}</span> {vendor.yearsExperience === 1 ? 'year' : 'years'} experience
              </span>
            </li>
            <li className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              Based in {vendor.lga}
            </li>
            {vendor.serviceAreas.length > 0 &&
            <li className="flex items-start gap-2">
                <MapPinnedIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-semibold text-ink">Serves:</span> {vendor.serviceAreas.join(', ')}
                </span>
              </li>
            }
          </ul>
        </div>
        <WorkingHoursCard hours={vendor.workingHours} />
      </div>
    </PageSection>);

}
