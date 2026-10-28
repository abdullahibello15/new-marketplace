import { useTranslation } from 'react-i18next';
import { LocateFixedIcon, MapPinOffIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { SearchInput } from '../../../../components/ui/SearchInput';
import { usePlacePicker } from '../../hooks/usePlacePicker';
import { PlaceOptionGroup } from './PlaceOptionGroup';

/** Mounted only while the sheet is open, so each opening starts with a fresh search. */
export function PlacePickerContent() {
  const p = usePlacePicker();
  const { t } = useTranslation('discovery');
  const nothingFound = p.groups.towns.length === 0 && p.groups.lgas.length === 0;

  function renderList() {
    if (p.status === 'error') return <ErrorState message={p.error ?? ''} onRetry={p.reload} />;
    if (p.status === 'loading') return <LoadingState label={t('place.loading')} rows={4} rowClassName="h-12" />;
    if (nothingFound) return <EmptyState icon={MapPinOffIcon} title={t('place.noneTitle')} description={t('place.noneText')} />;
    return (
      <div className="space-y-5">
        <PlaceOptionGroup title={t('place.towns')} places={p.groups.towns} currentId={p.current.id} onChoose={p.choose} />
        <PlaceOptionGroup title={t('place.lgas')} places={p.groups.lgas} currentId={p.current.id} onChoose={p.choose} />
      </div>);

  }

  return (
    <div className="space-y-4">
      <SearchInput value={p.query} onChange={p.setQuery} label={t('place.search')} placeholder={t('place.searchPlaceholder')} />
      <div>
        <Button variant="secondary" icon={LocateFixedIcon} loading={p.detecting} onClick={p.detectLocation} fullWidth>
          {t('place.useCurrent')}
        </Button>
        <p className="mt-1.5 text-center text-xs text-muted">{t('place.demoNote')}</p>
      </div>
      <div className="-mx-1 max-h-[45vh] overflow-y-auto px-1">{renderList()}</div>
    </div>);

}
