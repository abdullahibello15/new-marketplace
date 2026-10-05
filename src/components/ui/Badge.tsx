import React from 'react';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<BadgeTone, {badge: string;dot: string;}> = {
  neutral: { badge: 'bg-sand text-muted', dot: 'bg-muted' },
  success: { badge: 'bg-[#E3EEEC] text-pine', dot: 'bg-pine' },
  warning: { badge: 'bg-[#F7EBCB] text-mustard-dark', dot: 'bg-mustard-dark' },
  danger: { badge: 'bg-clay-soft text-clay-dark', dot: 'bg-clay-dark' },
  info: { badge: 'bg-[#E4EAF3] text-[#2B4A7A]', dot: 'bg-[#2B4A7A]' }
};

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ tone = 'neutral', dot = false, className = '', children }: BadgeProps) {
  const t = TONES[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold ${t.badge} ${className}`}>

      {dot && <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
      {children}
    </span>);

}
