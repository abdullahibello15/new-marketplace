import { AppShell } from './AppShell';
import { investorNav } from '../data/navigation';
import { InvestorDisclaimer } from '../features/investor/components/InvestorDisclaimer';
import { INVESTOR_ROUTES } from '../features/investor/constants';
import { mockInvestor } from '../features/investor/mock/investor';

/** The Investor role's layout: its own navigation, with the not-financial-advice note on every page. */
export function InvestorShell() {
  return (
    <AppShell
      navItems={investorNav}
      homeTo={INVESTOR_ROUTES.overview}
      modeLabel="Investor"
      account={{ name: mockInvestor.name, subtitle: 'Investor · read-only ledger' }}
      switchLink={{ to: '/', label: 'Customer mode' }}
      banner={<InvestorDisclaimer />} />);

}
