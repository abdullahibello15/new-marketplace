import { useTranslation } from 'react-i18next';
import { MapPinnedIcon, MessageSquareHeartIcon, UsersRoundIcon } from 'lucide-react';
import { IconCircle } from './ui';
import type { LandingHighlights } from '../types';

const formatCount = (n: number) => n.toLocaleString('en-NG');

/**
 * The numbers under the hero, counted from the app's data (listed providers, customer reviews, LGAs
 * covered). Confirmed marketing figures can replace them in LANDING_STATS_OVERRIDE once they're true.
 * The card keeps its height while loading, so nothing jumps. Shown at the top of the Categories panel.
 */
export function StatsRow({ highlights }: {highlights: LandingHighlights | null;}) {
  const { t } = useTranslation('landing');
  const items = [
  { icon: UsersRoundIcon, tone: 'teal' as const, value: highlights ? formatCount(highlights.stats.providers) : null, label: t('stats.providers', { count: highlights?.stats.providers ?? 0 }) },
  { icon: MessageSquareHeartIcon, tone: 'orange' as const, value: highlights ? formatCount(highlights.stats.reviews) : null, label: t('stats.reviews', { count: highlights?.stats.reviews ?? 0 }) },
  { icon: MapPinnedIcon, tone: 'gold' as const, value: highlights ? t('stats.lgasValue', { count: highlights.stats.lgas }) : null, label: t('stats.lgas') }];


  return (
    <section aria-label={t('stats.label')} className="relative mx-auto max-w-6xl px-4 sm:px-6">
      <ul className="landing-glass grid gap-3 p-4 sm:grid-cols-3 sm:divide-x sm:divide-[#B98C34]/25 sm:p-6">
        {items.map((item) =>
        <li key={item.label} className="flex items-center gap-4 p-2 sm:px-5">
            <IconCircle icon={item.icon} tone={item.tone} />
            <div className="min-w-0">
              <p className="landing-display h-9 text-3xl leading-9 text-[#16302F]">
                {item.value ?? <span className="inline-block h-7 w-16 animate-pulse rounded-lg bg-[#F1ECDF] align-middle motion-reduce:animate-none" aria-hidden="true" />}
              </p>
              <p className="text-base text-[#55524B]">{item.label}</p>
            </div>
          </li>
        )}
      </ul>
    </section>);

}
