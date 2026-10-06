import { Button } from '../../../../components/ui/Button';
import { Dialog } from '../../../../components/ui/Dialog';
import { Price } from '../../../../components/ui/Price';
import { useConfirmOrderSelection } from '../../hooks/useConfirmOrderSelection';
import { ItemThumb } from '../ItemThumb';
import type { Order } from '../../types';

interface ConfirmOrderDialogProps {
  open: boolean;
  order: Order;
  busy: boolean;
  /** Resolves true on success so the dialog closes. */
  onConfirm: (outOfStockIds: string[]) => Promise<boolean>;
  onClose: () => void;
}

/**
 * Confirm what you can supply. Untick lines you're out of: they're dropped from the order and not charged
 * (partial decline). Unticking everything marks the whole order Out of stock. Stock is taken on confirm.
 */
export function ConfirmOrderDialog({ open, order, busy, onConfirm, onClose }: ConfirmOrderDialogProps) {
  const s = useConfirmOrderSelection(order, open);
  const partial = !s.noneAvailable && s.outOfStock.length > 0;
  const label = s.noneAvailable ? 'Mark order out of stock' : partial ? `Confirm ${s.supplied.length} of ${order.items.length} items` : 'Confirm order';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={`Confirm order #${order.id}`}
      description="Tick the items you can supply. Confirming takes them out of your stock.">

      <fieldset>
        <legend className="sr-only">Items you can supply</legend>
        <ul className="space-y-2">
          {order.items.map((i) => {
            const stock = s.stockFor(i.productId);
            const short = stock < i.quantity;
            const checked = !s.outOfStock.includes(i.productId);
            return (
              <li key={i.productId}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2.5 has-[:checked]:border-pine has-[:checked]:bg-[#E3EEEC] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine/40">
                  <input type="checkbox" checked={checked} onChange={() => s.toggle(i.productId)} className="h-4 w-4 accent-pine" />
                  <ItemThumb src={i.image} className="h-10 w-10" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-bold text-ink">
                      {i.quantity} × {i.name}
                    </span>
                    <span className={`block ${short ? 'font-semibold text-clay-dark' : 'text-muted'}`}>
                      {stock} in stock{short ? ' – not enough' : ''}
                    </span>
                  </span>
                  <Price amount={i.unitPrice * i.quantity} className="shrink-0 text-sm font-semibold text-ink" />
                </label>
              </li>);

          })}
        </ul>
      </fieldset>

      <p aria-live="polite" className="mt-3 text-sm text-muted">
        {s.noneAvailable ?
        'Nothing ticked: the customer is told the order is out of stock and it ends here.' :
        partial ?
        <>
              Unticked items are removed and not charged. New items total: <Price amount={s.suppliedTotal} className="font-bold text-ink" />.
            </> :

        'Everything is in stock.'}
      </p>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Back
        </Button>
        <Button
          variant={s.noneAvailable ? 'danger' : 'primary'}
          loading={busy}
          onClick={async () => {
            if (await onConfirm(s.outOfStock)) onClose();
          }}>

          {label}
        </Button>
      </div>
    </Dialog>);

}
