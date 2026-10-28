import { useDraftCompleteness, useProfileCompleteness } from '../../hooks/useProfileCompleteness';
import { ProfileSectionNav } from '../ProfileSectionNav';
import type { ProfileSectionId } from '../../types';

interface EditorCompletenessNavProps {
  withErrors: ReadonlySet<ProfileSectionId>;
  hasEdits: boolean;
  /** Products are edited in the catalogue, so the saved count is used. */
  productCount: number;
}

/**
 * The section nav with the live score. Watching the whole form happens here, so only the nav re-renders
 * on each keystroke, not the editor.
 */
export function EditorCompletenessNav({ withErrors, hasEdits, productCount }: EditorCompletenessNavProps) {
  const saved = useProfileCompleteness();
  const draft = useDraftCompleteness(saved.data, productCount);
  return <ProfileSectionNav withErrors={withErrors} completeness={draft} hasEdits={hasEdits} />;
}
