/*
 * Landing buttons: orange primary with a soft glow on hover, outlined secondary, and a light outline for
 * dark backgrounds. All at least 44px tall for touch. The orange behind white text is a shade darker than
 * the brand orange so the text meets WCAG AA contrast.
 */
const BUTTON_BASE =
'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-6 py-3 text-center text-base font-bold transition-[background-color,box-shadow,color,border-color] duration-200 focus:outline-none focus-visible:ring-4 motion-reduce:transition-none';

export const landingButton = {
  primary: `${BUTTON_BASE} bg-[#C0501F] text-white shadow-[0_8px_20px_-8px_rgba(192,80,31,0.7)] hover:bg-[#A8441D] hover:shadow-[0_10px_30px_-6px_rgba(207,90,46,0.75)] focus-visible:ring-[#CF5A2E]/40`,
  secondary: `${BUTTON_BASE} border-2 border-[#1F4B4D] bg-white text-[#1F4B4D] hover:bg-[#E8F1EF] focus-visible:ring-[#1F4B4D]/30`,
  light: `${BUTTON_BASE} border-2 border-white/70 text-white hover:bg-white/10 focus-visible:ring-white/50`,
  /** Compact (header): still 44px tall for touch. */
  compact: 'min-h-[44px] px-4 py-2'
} as const;
