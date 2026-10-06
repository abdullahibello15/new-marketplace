import { BikeIcon, ScissorsIcon, WrenchIcon, ZapIcon } from 'lucide-react';
import type { Category } from '../types/marketplace';

const iconMap = {
  wrench: WrenchIcon,
  scissors: ScissorsIcon,
  zap: ZapIcon,
  bike: BikeIcon
};

interface CategoryIconProps {
  category: Category;
  size?: 'sm' | 'md';
}

export function CategoryIcon({ category, size = 'md' }: CategoryIconProps) {
  const Icon = iconMap[category.icon];
  const box = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl';
  return (
    <span className={`flex shrink-0 items-center justify-center ${box} ${category.tintClass}`} aria-hidden="true">
      <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={2.2} />
    </span>);

}