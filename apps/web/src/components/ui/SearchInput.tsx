import { SearchIcon } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (next: string) => void;
  /** Accessible label; also used as the placeholder unless one is given. */
  label: string;
  placeholder?: string;
  maxLength?: number;
}

export function SearchInput({ value, onChange, label, placeholder, maxLength = 80 }: SearchInputProps) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        type="search"
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className="w-full rounded-xl border border-line bg-white py-3 pl-12 pr-4 text-[15px] text-ink placeholder:text-muted focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20" />

    </label>);

}
