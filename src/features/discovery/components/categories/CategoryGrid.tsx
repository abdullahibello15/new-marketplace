import { useTranslation } from 'react-i18next';
import { browseCategories } from '../../../../data/tradeCategories';
import { CategoryTile } from './CategoryTile';

/** Every browsable category from the shared config. 4 across on phones, more as space allows. */
export function CategoryGrid() {
  const { t } = useTranslation('discovery');
  return (
    <section aria-labelledby="categories-heading">
      <h2 id="categories-heading" className="text-xs font-bold uppercase tracking-wider text-muted">
        {t('home.browseCategories')}
      </h2>
      <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-6 xl:grid-cols-9">
        {browseCategories.map((c) =>
        <li key={c.id}>
            <CategoryTile category={c} />
          </li>
        )}
      </ul>
    </section>);

}
