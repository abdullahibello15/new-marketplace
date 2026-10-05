import { BadgeCheckIcon, IdCardIcon, ShieldQuestionIcon, type LucideIcon } from 'lucide-react';
import { findVerificationTier } from '../data/verificationTiers';
import type { Verification } from '../types/marketplace';

const STYLES: Record<Verification, {icon: LucideIcon;className: string;}> = {
  trade: { icon: BadgeCheckIcon, className: 'bg-mustard text-ink' },
  id: { icon: IdCardIcon, className: 'bg-pine-deep text-white' },
  unverified: { icon: ShieldQuestionIcon, className: 'bg-sand text-muted' }
};

export function VerificationBadge({ verification }: {verification: Verification;}) {
  const { icon: Icon, className } = STYLES[verification];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {findVerificationTier(verification)?.label}
    </span>);

}
