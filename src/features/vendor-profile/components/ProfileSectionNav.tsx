import { PROFILE_SECTIONS, profileSectionAnchor } from '../constants';
import type { ProfileSectionId } from '../types';

/** Jump links to each section. Sections with validation errors get a red dot. */
export function ProfileSectionNav({ withErrors }: {withErrors: ReadonlySet<ProfileSectionId>;}) {
  return (
    <nav aria-label="Profile sections" className="sticky top-0 z-10 -mx-5 bg-cream/95 px-5 py-2 backdrop-blur lg:mx-0 lg:px-0">
      <ul className="flex gap-2 overflow-x-auto">
        {PROFILE_SECTIONS.map((s) => {
          const hasError = withErrors.has(s.id);
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${profileSectionAnchor(s.id)}`}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-sand px-3 py-1.5 text-sm font-bold text-ink transition-colors duration-150 hover:bg-line focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

                {s.label}
                {hasError &&
                <>
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-clay" />
                    <span className="sr-only">(needs attention)</span>
                  </>
                }
              </a>
            </li>);

        })}
      </ul>
    </nav>);

}
