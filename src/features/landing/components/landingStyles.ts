/*
 * Landing buttons, classic style. Orange is kept for the one main call to action (`cta`); everything else
 * is deep teal (`primary`), a fine outlined `secondary`, or `light` for the deep-teal sections. All at
 * least 44px tall for touch; white text on the orange and teal backgrounds meets WCAG AA contrast.
 */
const BUTTON_BASE =
'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 py-3 text-center text-base font-semibold tracking-[0.01em] transition-[background-color,box-shadow,color,border-color,transform] duration-200 focus:outline-none focus-visible:ring-4 motion-reduce:transition-none';

export const landingButton = {
  /** The main call to action only. */
  cta: `${BUTTON_BASE} bg-[#C0501F] text-white shadow-[0_10px_24px_-10px_rgba(192,80,31,0.6)] hover:bg-[#A8441D] focus-visible:ring-[#CF5A2E]/35`,
  primary: `${BUTTON_BASE} bg-[#1F4B4D] text-white shadow-[0_10px_24px_-12px_rgba(15,60,60,0.55)] hover:bg-[#163A3C] focus-visible:ring-[#1F4B4D]/30`,
  secondary: `${BUTTON_BASE} border border-[#B98C34]/60 bg-white/50 text-[#1F4B4D] hover:border-[#B98C34] hover:bg-white/80 focus-visible:ring-[#1F4B4D]/25`,
  light: `${BUTTON_BASE} border border-[#E6CF95]/60 text-white hover:border-[#E6CF95] hover:bg-white/10 focus-visible:ring-white/40`,
  /** Light filled, for the main action on deep teal. */
  onDark: `${BUTTON_BASE} bg-[#FAF6EE] text-[#163A3C] hover:bg-white focus-visible:ring-white/50`,
  /** Compact (header): still 44px tall for touch. */
  compact: 'min-h-[44px] px-5 py-2'
} as const;
