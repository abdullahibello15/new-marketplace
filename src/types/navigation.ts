import type { LucideIcon } from 'lucide-react';

/** "main" items sit at the top of the sidebar; "account" items sit in a group above the account footer. */
export type NavGroup = 'main' | 'account';

/** Where an item lives on phones: the bottom bar, or the "More" menu when the bar would be too crowded. */
export type MobileNavPlacement = 'bar' | 'more';

export interface NavItem {
  to: string;
  label: string;
  /** Used in the mobile bottom bar, where space is tight. Falls back to `label`. */
  shortLabel?: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
  badge?: number;
  /** Defaults to "main". */
  group?: NavGroup;
  /** Defaults to "bar". */
  mobile?: MobileNavPlacement;
}
