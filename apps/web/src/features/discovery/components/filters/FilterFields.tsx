import { AreaFilterField } from './AreaFilterField';
import { CategoryFilterField } from './CategoryFilterField';
import { PriceFilterField } from './PriceFilterField';
import { TierFilterField } from './TierFilterField';

/** All filter groups. Needs a FilterForm in context (see useFilterForm). */
export function FilterFields() {
  return (
    <div className="space-y-5">
      <CategoryFilterField />
      <TierFilterField />
      <AreaFilterField />
      <PriceFilterField />
    </div>);

}
