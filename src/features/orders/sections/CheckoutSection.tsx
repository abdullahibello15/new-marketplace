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

const BACK = { to: ORDER_ROUTES.cart, label: 'Cart' };

/** Checkout: confirm any price or stock changes, choose pickup or delivery per vendor, place one order per vendor. */
export function CheckoutSection() {
  const c = useCheckout();

  function renderBody() {
    if (c.result) return <CheckoutSuccess result={c.result} />;
    if (c.lines.length === 0) {
      return (
        <EmptyState
          icon={ShoppingCartIcon}
          title="Nothing to check out"
          description="Your cart is empty. Add products from a vendor’s shop first."
          action={
          <Link to={SEARCH_ROUTE} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              Browse vendors
            </Link>
          } />);


    }
    if (c.check.status === 'error') return <ErrorState title="Couldn’t check your cart" message={c.check.error ?? ''} onRetry={c.recheck} />;
    if (c.places.status === 'error') return <ErrorState title="Couldn’t load delivery areas" message={c.places.error ?? ''} onRetry={c.places.reload} />;
    if (!c.check.data || !c.places.data || c.check.status === 'loading') return <LoadingState label="Checking prices and stock" rows={2} rowClassName="h-48" />;

    const { changes, items } = c.check.data;
    if (changes.length > 0) return <CartChangesNotice changes={changes} onAccept={c.acceptChanges} />;
    if (items.length === 0) {
      return (
        <EmptyState
          icon={ShoppingCartIcon}
          title="Nothing left to order"
          description="Everything in your cart sold out or is no longer available."
          action={
          <Link to={SEARCH_ROUTE} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              Browse vendors
            </Link>
          } />);


    }
    return <CheckoutForm check={c.check.data} places={c.places.data} onChanged={c.recheck} onPlaced={c.complete} />;
  }

  return (
    <>
      <PageHeader title={c.result ? 'Thank you' : 'Checkout'} subtitle={c.result ? undefined : 'Choose pickup or delivery for each vendor'} backTo={c.result ? undefined : BACK} />
      <PageContainer>{renderBody()}</PageContainer>
    </>);

}
