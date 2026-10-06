import { useId } from 'react';

interface DemoSimulatorProps<T extends string> {
  title: string;
  options: {id: T;label: string;}[];
  value: T;
  onChange: (next: T) => void;
}

/**
 * MOCK only: picks what the customer's bank does in this demo. Clearly labelled so nobody mistakes it
 * for part of the real flow. Hidden when SHOW_PAYMENT_SIMULATOR is off.
 */
export function DemoSimulator<T extends string>({ title, options, value, onChange }: DemoSimulatorProps<T>) {
  const name = useId();
  return (
    <fieldset className="rounded-xl border border-dashed border-mustard bg-[#FBF3DC]/60 px-3 py-2.5 text-sm">
      <legend className="px-1 text-xs font-bold uppercase tracking-wider text-mustard-dark">Demo · {title}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {options.map((o) =>
        <label key={o.id} className="flex items-center gap-1.5 text-ink">
            <input type="radio" name={name} checked={value === o.id} onChange={() => onChange(o.id)} className="h-4 w-4 accent-pine" />
            {o.label}
          </label>
        )}
      </div>
    </fieldset>);

}
