import { useId } from 'react';
import { Switch } from '../../../components/Switch';

interface PreferenceToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** One labelled on/off row on the preferences page. */
export function PreferenceToggle({ label, description, checked, onChange, disabled = false }: PreferenceToggleProps) {
  const descriptionId = useId();
  return (
    <div className={`flex items-center justify-between gap-4 py-4 ${disabled ? 'opacity-60' : ''}`}>
      <div>
        <p className="font-bold text-ink">{label}</p>
        <p id={descriptionId} className="text-sm text-muted">
          {description}
        </p>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} disabled={disabled} describedBy={descriptionId} />
    </div>);

}
