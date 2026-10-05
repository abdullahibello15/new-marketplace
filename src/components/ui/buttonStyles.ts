export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'highlight';
export type ButtonSize = 'sm' | 'md';

const BASE =
'inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-[background-color,border-color,color,filter,transform] duration-150 ease-out active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100';

// Each variant sets its own ring offset colour to match the surface it sits on.
const ON_LIGHT = 'focus-visible:ring-offset-cream';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: `bg-pine-deep text-white hover:bg-pine focus-visible:ring-pine ${ON_LIGHT}`,
  accent: `bg-clay text-white hover:bg-clay-dark focus-visible:ring-clay ${ON_LIGHT}`,
  secondary: `bg-sand text-ink hover:bg-line focus-visible:ring-pine/40 ${ON_LIGHT}`,
  outline: `border border-line bg-white text-ink hover:border-ink/30 focus-visible:ring-pine/40 ${ON_LIGHT}`,
  danger: `bg-clay-dark text-white hover:bg-[#8F3916] focus-visible:ring-clay ${ON_LIGHT}`,
  ghost: `text-muted hover:bg-sand hover:text-ink focus-visible:ring-pine/40 ${ON_LIGHT}`,
  /** Call to action on the dark pine surfaces. */
  highlight: 'bg-mustard text-ink hover:brightness-105 focus-visible:ring-white/70 focus-visible:ring-offset-pine-deep'
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'rounded-lg px-3 py-2 text-sm',
  md: 'rounded-xl px-5 py-3 text-[15px]'
};

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/** Shared by <Button> and by router <Link>s that should look like buttons. */
export function buttonClasses({ variant = 'primary', size = 'md', fullWidth = false }: ButtonStyleOptions = {}): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''}`;
}
