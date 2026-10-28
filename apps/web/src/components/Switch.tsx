interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  /** id of text explaining the switch, e.g. why it is disabled. */
  describedBy?: string;
}

export function Switch({ checked, onChange, label, disabled, describedBy }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
      checked ? 'bg-pine' : 'bg-muted/30'}`
      }>

      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 rounded-full bg-white transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`
        } />

    </button>);

}
