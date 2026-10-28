import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SparklesIcon } from 'lucide-react';
import { DASHBOARD_ROUTES } from '../../constants';
import { planLimitNoun, planLimitWords, planName } from '../../../../i18n/labels';
import { PLAN_LIMIT_LABELS, planAllowingMore } from '../../plans';
import type { PlanLimitKey, SubscriptionPlan } from '../../types';

interface UpgradePromptProps {
  limitKey: PlanLimitKey;
  /** The vendor's current plan. */
  plan: SubscriptionPlan;
}

/** "You've reached the 3 services on Starter. Upgrade to Standard for 10." Shown wherever a plan limit stops an add. */
export function UpgradePrompt({ limitKey, plan }: UpgradePromptProps) {
  const { t } = useTranslation('vendor');
  const limit = plan.limits[limitKey] ?? 0;
  const words = PLAN_LIMIT_LABELS[limitKey];
  const next = planAllowingMore(limitKey, limit);
  const nextLimit = next ? next.limits[limitKey] : null;

  return (
    <div role="status" className="flex flex-col gap-2 rounded-xl border border-mustard bg-[#FBF3DC] px-3 py-3 text-sm text-ink sm:flex-row sm:items-center">
      <SparklesIcon className="h-4 w-4 shrink-0 text-mustard-dark" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        {t('subscription.upgrade.reached', { what: planLimitWords(limitKey, limit, limit === 1 ? words.one : words.many), plan: planName(plan.id, plan.name) })}
        {next &&
        ` ${nextLimit === null ?
        t('subscription.upgrade.unlimited', { plan: planName(next.id, next.name), what: planLimitNoun(limitKey, words.many) }) :
        t('subscription.upgrade.to', { plan: planName(next.id, next.name), what: planLimitWords(limitKey, nextLimit, words.many) })}`}
      </p>
      {next &&
      <Link
        to={DASHBOARD_ROUTES.subscription}
        className="shrink-0 rounded-lg bg-pine-deep px-3 py-1.5 text-center font-bold text-white hover:bg-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-2">

          {t('subscription.upgrade.seePlans')}
        </Link>
      }
    </div>);

}
