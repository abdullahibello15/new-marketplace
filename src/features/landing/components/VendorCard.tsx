import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MapPinIcon, StarIcon } from 'lucide-react';
import { VerificationBadge } from '../../../components/VerificationBadge';
import { tradeLabel } from '../../../i18n/labels';
import { formatNaira } from '../../../utils/format';
import { AUTH_ROUTES, ROLE } from '../../auth/constants';
import { landingButton } from './landingStyles';
import type { LoginRedirectState } from '../../auth/components/guards';
import type { LandingVendorCard } from '../types';

/**
 * A provider or shop: photo, verification badge, rating, area, starting price, and "Book now" or
 * "View shop". Visitors go to signup first, then straight to that profile.
 */
export function VendorCard({ vendor }: {vendor: LandingVendorCard;}) {
  const { t } = useTranslation('landing');
  const shop = vendor.kind === 'retail';
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#EFE7D6] bg-white shadow-[0_12px_30px_-20px_rgba(22,58,60,0.5)] transition-shadow duration-200 hover:shadow-[0_18px_40px_-18px_rgba(22,58,60,0.55)] motion-reduce:transition-none">
      <div className="relative">
        <img
          src={vendor.photo}
          width={480}
          height={360}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full object-cover" />

        {vendor.verification !== 'unverified' &&
        <span className="absolute left-3 top-3 rounded-full bg-white/95 p-0.5 shadow-sm">
            <VerificationBadge verification={vendor.verification} />
          </span>
        }
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-extrabold leading-snug text-[#1C1B18]">{vendor.name}</h3>
        <p className="text-sm font-semibold text-[#5E594F]">{tradeLabel(vendor.tradeCategory)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#5E594F]">
          {vendor.reviews > 0 &&
          <span className="inline-flex items-center gap-1 font-bold text-[#1C1B18]">
              <StarIcon className="h-4 w-4 fill-[#D9A933] text-[#D9A933]" aria-hidden="true" />
              {vendor.rating.toFixed(1)}
              <span className="font-normal text-[#5E594F]">{t('market.reviews', { count: vendor.reviews })}</span>
            </span>
          }
          <span className="inline-flex items-center gap-1">
            <MapPinIcon className="h-4 w-4" aria-hidden="true" />
            {vendor.area}
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <p className="text-base text-[#5E594F]">
            {vendor.priceFrom !== null && <PriceFrom price={formatNaira(vendor.priceFrom)} />}
          </p>
          <Link
            to={AUTH_ROUTES.signupFor(ROLE.Customer)}
            state={{ from: `/vendors/${vendor.id}` } satisfies LoginRedirectState}
            aria-label={`${shop ? t('market.viewShop') : t('market.bookNow')}: ${vendor.name}`}
            className={`${landingButton.primary} ${landingButton.compact} shrink-0`}>

            {shop ? t('market.viewShop') : t('market.bookNow')}
          </Link>
        </div>
      </div>
    </article>);

}

/** "From ₦2,000" with the price in bold. */
function PriceFrom({ price }: {price: string;}) {
  const { t } = useTranslation('landing');
  return <>{t('market.from')} <strong className="text-[#1C1B18]">{price}</strong></>;
}
