import { Link } from 'react-router-dom';
import type { NavItem } from '../../types/navigation';

export function SidebarLink({ item, active }: {item: NavItem;active: boolean;}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
      active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>

      <Icon className="h-5 w-5" aria-hidden="true" />
      {item.label}
      {item.badge ?
      <span className="ml-auto rounded-full bg-clay px-2 text-xs font-bold leading-5 text-white">{item.badge}</span> :
      null}
    </Link>);

}
