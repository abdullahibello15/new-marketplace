import { useTranslation } from 'react-i18next';
import { AppShell } from './AppShell';
import { riderNav } from '../data/navigation';

/** The rider shell (navigation only for now; delivery features come later). */
export function RiderShell() {
  const { t } = useTranslation();
  return <AppShell navItems={riderNav} homeTo="/rider" modeLabel={t('shell.modeRider')} />;
}
