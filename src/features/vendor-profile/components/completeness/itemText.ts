import type { TFunction } from 'i18next';
import { COMPLETENESS_RULES } from '../../completenessConfig';
import type { CompletenessItem, CompletenessItemId } from '../../types';

/** Numbers some item texts mention ("Add 3+ portfolio photos"), taken from the config so they never disagree. */
const ITEM_MIN: Partial<Record<CompletenessItemId, number>> = {
  bio: COMPLETENESS_RULES.bioMinLength,
  portfolio: COMPLETENESS_RULES.portfolioMinPhotos
};

/** The checklist label and hint for one item, in the current language. */
export function completenessItemText(t: TFunction, item: CompletenessItem): {label: string;hint: string;} {
  const values = { min: ITEM_MIN[item.id] };
  return { label: t(`vendor:completeness.item.${item.id}.label`, values), hint: t(item.hint, values) };
}
