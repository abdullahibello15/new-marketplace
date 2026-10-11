import { useTranslation } from 'react-i18next';
import { CheckIcon } from 'lucide-react';
import { profileSectionLabel } from '../../../i18n/labels';
import { PROFILE_SECTIONS, profileSectionAnchor } from '../constants';
import { sectionCompleteness } from '../utils/completeness';
import { CompletenessRing } from './completeness/CompletenessRing';
import type { ProfileCompleteness, ProfileSectionId } from '../types';

interface ProfileSectionNavProps {
  withErrors: ReadonlySet<ProfileSectionId>;
  /** Live score of the form as it is now (null while loading): a tick per complete section, a dot where something is missing. */
  completeness: ProfileCompleteness | null;
  /** The form has unsaved changes, so the score includes them. */
  hasEdits: boolean;
}

/** Jump links to each section. Sections with validation errors get a red dot; the profile score shows up front. */
export function ProfileSectionNav({ withErrors, completeness, hasEdits }: ProfileSectionNavProps) {
  const { t } = useTranslation('vendor');
  const sections = completeness ? sectionCompleteness(completeness) : new Map<ProfileSectionId, boolean>();
  const summary = completeness ?
  hasEdits ? t('completeness.nav.withEdits', { percent: completeness.score }) : t('completeness.nav.summary', { percent: completeness.score }) :
  null;

  return (
    <nav aria-label={t('profile.sections')} className="sticky top-0 z-10 -mx-5 bg-cream/95 px-5 py-2 backdrop-blur lg:mx-0 lg:px-0">
      <ul className="flex items-center gap-2 overflow-x-auto">
        {completeness && summary &&
        <li className="shrink-0" title={summary}>
            <span className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-bold tabular-nums text-ink" aria-live="polite">
              <CompletenessRing score={completeness.score} size={22} label={summary} showValue={false} />
              <span aria-hidden="true">{completeness.score}%</span>
            </span>
          </li>
        }
        {PROFILE_SECTIONS.map((s) => {
          const hasError = withErrors.has(s.id);
          const done = sections.get(s.id);
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${profileSectionAnchor(s.id)}`}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-sand px-3 py-1.5 text-sm font-bold text-ink transition-colors duration-150 hover:bg-line focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

                {profileSectionLabel(s.id, s.label)}
                {hasError ?
                <>
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-clay" />
                    <span className="sr-only">({t('profile.needsAttention')})</span>
                  </> :
                done === true ?
                <>
                    <CheckIcon className="h-3.5 w-3.5 text-pine" aria-hidden="true" />
                    <span className="sr-only">({t('completeness.nav.sectionDone')})</span>
                  </> :
                done === false ?
                <>
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-mustard-dark" />
                    <span className="sr-only">({t('completeness.nav.sectionTodo')})</span>
                  </> :
                null}
              </a>
            </li>);

        })}
      </ul>
    </nav>);

}
