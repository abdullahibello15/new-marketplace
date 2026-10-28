import { useTranslation } from 'react-i18next';
import { MessageSquareIcon } from 'lucide-react';

/** Where job messages will go. Kept so the page layout is final before messaging ships. */
export function MessagesPlaceholder({ otherParty }: {otherParty: string;}) {
  const { t } = useTranslation('jobs');
  return (
    <section aria-labelledby="messages-heading" className="rounded-2xl border border-dashed border-line p-4 lg:p-5">
      <h2 id="messages-heading" className="flex items-center gap-2 text-base font-bold text-ink">
        <MessageSquareIcon className="h-4 w-4 text-muted" aria-hidden="true" />
        {t('messages.title')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('messages.comingSoon', { name: otherParty })}</p>
    </section>);

}
