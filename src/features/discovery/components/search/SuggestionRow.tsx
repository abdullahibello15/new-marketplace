import { HistoryIcon, LayoutGridIcon, StoreIcon, WrenchIcon, type LucideIcon } from 'lucide-react';
import type { SuggestionGroupId, SuggestionOption } from '../../types';

const GROUP_ICONS: Record<SuggestionGroupId, LucideIcon> = {
  recent: HistoryIcon,
  categories: LayoutGridIcon,
  services: WrenchIcon,
  vendors: StoreIcon
};

interface SuggestionRowProps {
  option: SuggestionOption;
  domId: string;
  active: boolean;
  onSelect: (option: SuggestionOption) => void;
}

export function SuggestionRow({ option, domId, active, onSelect }: SuggestionRowProps) {
  const Icon = GROUP_ICONS[option.group];
  return (
    <li
      id={domId}
      role="option"
      aria-selected={active}
      onClick={() => onSelect(option)}
      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${active ? 'bg-[#E3EEEC]' : 'hover:bg-sand'}`}>

      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sand text-muted" aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{option.label}</span>
        {option.detail && <span className="block truncate text-sm text-muted">{option.detail}</span>}
      </span>
    </li>);

}
