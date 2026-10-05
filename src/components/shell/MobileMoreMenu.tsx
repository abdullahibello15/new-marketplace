import { Link } from 'react-router-dom';
import { ArrowLeftRightIcon } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import type { NavItem } from '../../types/navigation';

interface MobileMoreMenuProps {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  pathname: string;
  switchLink: {to: string;label: string;};
}

const rowClass =
'flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40';

/** Phone-only menu for the nav items that don't fit in the bottom bar. */
export function MobileMoreMenu({ open, onClose, items, pathname, switchLink }: MobileMoreMenuProps) {
  return (
    <Dialog open={open} onClose={onClose} title="More">
      <nav aria-label="More">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={`${rowClass} ${active ? 'bg-[#E3EEEC] text-pine' : 'text-ink hover:bg-sand'}`}>

                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>);

          })}
        </ul>
        <Link to={switchLink.to} onClick={onClose} className={`${rowClass} mt-3 border-t border-line pt-4 text-muted hover:text-ink`}>
          <ArrowLeftRightIcon className="h-5 w-5" aria-hidden="true" />
          {switchLink.label}
        </Link>
      </nav>
    </Dialog>);

}
