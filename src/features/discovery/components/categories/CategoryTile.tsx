import { Link } from 'react-router-dom';
import { buildSearchUrl } from '../../utils/searchUrl';
import type { TradeCategoryOption } from '../../../../types/marketplace';

export function CategoryTile({ category }: {category: TradeCategoryOption;}) {
  const Icon = category.icon;
  return (
    <Link
      to={buildSearchUrl({ kind: 'category', category: category.id })}
      className="flex h-full flex-col items-center gap-2 rounded-2xl border border-line bg-white px-1 py-3 text-center transition-[border-color,transform] duration-150 ease-out hover:border-pine/40 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${category.tintClass}`} aria-hidden="true">
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="text-[12px] font-semibold leading-tight text-ink sm:text-[13px]">{category.browseLabel}</span>
    </Link>);

}
