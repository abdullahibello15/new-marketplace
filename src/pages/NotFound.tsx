import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function NotFound({ message }: {message?: string;}) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-24 text-center">
      <p className="text-lg font-bold text-ink">{message ?? t('notFound.message')}</p>
      <Link to="/" className="mt-4 rounded-xl bg-pine px-5 py-3 text-sm font-bold text-white hover:bg-pine-deep">
        {t('notFound.home')}
      </Link>
    </div>);

}