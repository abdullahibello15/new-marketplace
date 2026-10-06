import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import type { NavBadgeStyle } from '../../types/navigation';

interface BottomNavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  badge?: number;
  badgeStyle?: NavBadgeStyle;
  badgeLabel?: string;
  /** Renders a link when set; otherwise a button (e.g. the "More" menu toggle). */
  to?: string;
  onClick?: () => void;
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

const itemClass = 'relative flex w-full flex-col items-center gap-1 py-2.5 focus:outline-none focus-visible:bg-sand';

/** One slot in the phone bottom bar. Links and the menu toggle look identical. */
export function BottomNavItem({ icon: Icon, label, active, badge, badgeStyle = 'dot', badgeLabel, to, onClick, buttonProps }: BottomNavItemProps) {
  const content =
  <>
      <span
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-150 ${
      active ? 'bg-pine text-white' : 'bg-sand text-muted'}`}>

        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className={`text-[11px] ${active ? 'font-bold text-ink' : 'font-semibold text-muted'}`}>{label}</span>
      {badge && badgeStyle === 'count' ?
    <span className="absolute left-[calc(50%+4px)] top-1 min-w-[18px] rounded-full border-2 border-cream bg-clay px-1 text-center text-[10px] font-bold leading-[14px] text-white">
          <span aria-hidden="true">{badge > 99 ? '99+' : badge}</span>
          <span className="sr-only">{badgeLabel ?? `${badge} new`}</span>
        </span> :
    badge ?
    <span
      className="absolute right-[calc(50%-18px)] top-2 h-2.5 w-2.5 rounded-full border-2 border-cream bg-clay"
      aria-label={badgeLabel ?? `${badge} new`} /> :

    null}
    </>;


  if (to) {
    return (
      <Link to={to} aria-current={active ? 'page' : undefined} className={itemClass}>
        {content}
      </Link>);

  }
  return (
    <button type="button" onClick={onClick} className={itemClass} {...buttonProps}>
      {content}
    </button>);

}
