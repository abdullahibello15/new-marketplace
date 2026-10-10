import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { SEARCH_ROUTE } from '../../discovery/constants';
import { ORDER_ROUTES } from '../constants';
import { CartChangesNotice } from '../components/checkout/CartChangesNotice';
import { CheckoutForm } from '../components/checkout/CheckoutForm';
import { CheckoutSuccess } from '../components/checkout/CheckoutSuccess';
import { useCheckout } from '../hooks/useCheckout';


/** Checkout: confirm any price or stock changes, choose pickup or delivery per vendor, place one order per vendor. */
export function CheckoutSection() {
  const { t } = useTranslation('jobs');
  const BACK = { to: ORDER_ROUTES.cart, label: t('order.checkout.back') };
  const c = useCheckout();

  function renderBody() {
    if (c.result) return <CheckoutSuccess result={c.result} />;
    if (c.lines.length === 0) {
      return (
        <EmptyState
          icon={ShoppingCartIcon}
          title={t('order.checkout.nothingTitle')}
          description={t('order.checkout.nothingText')}
          action={
          <Link to={SEARCH_ROUTE} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              {t('order.cart.browse')}
            </Link>
          } />);


    }
    if (c.check.status === 'error') return <ErrorState title={t('order.checkout.checkFailed')} message={c.check.error ?? ''} onRetry={c.recheck} />;
    if (c.places.status === 'error') return <ErrorState title={t('order.checkout.areasFailed')} message={c.places.error ?? ''} onRetry={c.places.reload} />;
    if (!c.check.data || !c.places.data || c.check.status === 'loading') return <LoadingState label={t('order.checkout.checking')} rows={2} rowClassName="h-48" />;

    const { changes, items } = c.check.data;
    if (changes.length > 0) return <CartChangesNotice changes={changes} onAccept={c.acceptChanges} />;
    if (items.length === 0) {
      return (
        <EmptyState
          icon={ShoppingCartIcon}
          title={t('order.checkout.nothingLeftTitle')}
          description={t('order.checkout.nothingLeftText')}
          action={
          <Link to={SEARCH_ROUTE} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              {t('order.cart.browse')}
            </Link>
          } />);


    }
    return <CheckoutForm check={c.check.data} places={c.places.data} onChanged={c.recheck} onPlaced={c.complete} />;
  }

  return (
    <>
      <PageHeader title={c.result ? t('order.checkout.thanks') : t('order.checkout.title')} subtitle={c.result ? undefined : t('order.checkout.subtitle')} backTo={c.result ? undefined : BACK} />
      <PageContainer>{renderBody()}</PageContainer>
    </>);

}
