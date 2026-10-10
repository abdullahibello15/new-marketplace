import { useTranslation } from 'react-i18next';
/** A row's status in a spreadsheet import preview, shared by the product and bulk vendor imports. */

export type ImportRowTone = 'ready' | 'warning' | 'invalid' | 'skipped';

const IMPORT_STATUS_STYLE: Record<ImportRowTone, {label: string;className: string;}> = {
  ready: { label: 'import.status.ready', className: 'bg-[#E3EEEC] text-pine' },
  warning: { label: 'import.status.warning', className: 'bg-[#FBEFD2] text-mustard-dark' },
  invalid: { label: 'import.status.invalid', className: 'bg-clay-soft text-clay-dark' },
  skipped: { label: 'import.status.skipped', className: 'bg-sand text-muted' }
};

export function ImportStatusChip({ tone, label }: {tone: ImportRowTone;label?: string;}) {
  const { t } = useTranslation();
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${IMPORT_STATUS_STYLE[tone].className}`}>
      {label ?? t(IMPORT_STATUS_STYLE[tone].label)}
    </span>);

}

/** The chip, then the row's errors and warnings. */
export function ImportStatusBlock({ tone, label, errors, warnings }: {tone: ImportRowTone;label?: string;errors: string[];warnings: string[];}) {
  return (
    <>
      <ImportStatusChip tone={tone} label={label} />
      {tone !== 'skipped' && (errors.length > 0 || warnings.length > 0) &&
      <ul className="mt-1.5 space-y-0.5 text-xs">
          {errors.map((e) =>
        <li key={e} className="font-medium text-clay-dark">{e}</li>
        )}
          {warnings.map((w) =>
        <li key={w} className="text-mustard-dark">{w}</li>
        )}
        </ul>
      }
    </>);

}
