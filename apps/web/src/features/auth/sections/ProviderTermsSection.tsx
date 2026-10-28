import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../components/PageHeader';
import { PageContainer } from '../../../components/ui/PageContainer';

/** /terms/providers — ⚠️ PLACEHOLDER: replace with the real provider terms before launch. */
export function ProviderTermsSection() {
  const { t } = useTranslation('auth');
  return (
    <>
      <PageHeader title={t('terms.title')} subtitle={t('terms.subtitle')} />
      <PageContainer>
        <div className="max-w-2xl space-y-3 rounded-2xl border border-dashed border-mustard bg-[#FBF3DC] p-5 text-sm">
          <p className="font-bold">{t('terms.placeholder')}</p>
          <ul className="list-disc space-y-1 pl-5">
            {(['item1', 'item2', 'item3', 'item4'] as const).map((k) => <li key={k}>{t(`terms.${k}`)}</li>)}
          </ul>
        </div>
      </PageContainer>
    </>);

}
