import { formatDistanceToNowStrict } from 'date-fns';
import { LockIcon, UserCheckIcon } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { Claim } from '../types';

interface ClaimBannerProps {
  claim: Claim | null;
  /** The signed-in admin's id. */
  meId: string;
  /** "application" or "dispute", for the wording. */
  noun: string;
  canClaim: boolean;
  canTakeOver: boolean;
  busy: boolean;
  onClaim: (takeOver: boolean) => void;
  onRelease?: () => void;
  /** Disputes are kept by their mediator; verification claims expire. */
  expires?: boolean;
}

/** Who is working on this item, so two admins never review it at the same time. */
export function ClaimBanner({ claim, meId, noun, canClaim, canTakeOver, busy, onClaim, onRelease, expires = true }: ClaimBannerProps) {
  if (claim && claim.adminId === meId) {
    return (
      <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-pine/30 bg-[#E3EEEC] px-4 py-3 text-sm">
        <UserCheckIcon className="h-5 w-5 text-pine" aria-hidden="true" />
        <p className="flex-1">
          <strong>You’re reviewing this {noun}.</strong>
          {expires && ` Your claim lapses ${formatDistanceToNowStrict(new Date(claim.expiresAt), { addSuffix: true })} if you don’t decide.`}
        </p>
        {onRelease &&
        <Button variant="secondary" size="sm" onClick={onRelease} disabled={busy}>
            Release
          </Button>
        }
      </div>);

  }
  if (claim) {
    return (
      <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-mustard bg-[#FBF3DC] px-4 py-3 text-sm">
        <LockIcon className="h-5 w-5 text-mustard-dark" aria-hidden="true" />
        <p className="flex-1">
          <strong>{claim.adminName}</strong> is working on this {noun} (since {formatDistanceToNowStrict(new Date(claim.at), { addSuffix: true })}). Actions are locked so you don’t
          overlap.
        </p>
        {canTakeOver &&
        <Button variant="outline" size="sm" onClick={() => onClaim(true)} loading={busy}>
            Take over
          </Button>
        }
      </div>);

  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm">
      <p className="flex-1 text-muted">Nobody is working on this {noun}. Claim it before you start so no one else picks it up.</p>
      {canClaim &&
      <Button size="sm" onClick={() => onClaim(false)} loading={busy}>
          Claim {noun}
        </Button>
      }
    </div>);

}
