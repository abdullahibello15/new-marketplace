import { useId } from 'react';
import { Controller } from 'react-hook-form';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { FormField } from '../../../../components/ui/FormField';
import { bad, field, ok } from '../../../../components/vendor/formStyles';
import { formatNumberInput } from '../../../../lib/numberInput';
import { formatNaira } from '../../../../utils/format';
import { JOB_ACTOR } from '../../../jobs/constants';
import { useCashConfirmation } from '../../hooks/useCashConfirmation';
import type { JobParty } from '../../../jobs/types';
import type { Payment } from '../../types';

interface CashConfirmationFormProps {
  payment: Payment;
  party: JobParty;
  /** The other person's name, for the wording. */
  otherName: string;
  onUpdated: (p: Payment) => void;
}

/** "Cash received ₦X" (vendor) or "I paid ₦X" (customer): the amount, then a confirmation dialog. */
export function CashConfirmationForm({ payment, party, otherName, onUpdated }: CashConfirmationFormProps) {
  const id = useId();
  const c = useCashConfirmation(payment, party, onUpdated);
  const errors = c.form.formState.errors;
  const isVendor = party === JOB_ACTOR.Vendor;

  return (
    <form onSubmit={c.review} noValidate className="space-y-3">
      <Controller
        control={c.form.control}
        name="amount"
        render={({ field: f }) =>
        <FormField
          id={`${id}-amount`}
          label={isVendor ? `Cash you received from ${otherName} (₦)` : `Cash you paid ${otherName} (₦)`}
          hint={`The agreed amount was ${formatNaira(payment.amount)}. Change it if a different amount changed hands.`}
          error={errors.amount?.message}>

            {(describedBy) =>
          <input
            id={`${id}-amount`}
            inputMode="numeric"
            value={f.value}
            onChange={(e) => f.onChange(formatNumberInput(e.target.value))}
            onBlur={f.onBlur}
            ref={f.ref}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={describedBy}
            className={`${field} ${errors.amount ? bad : ok}`} />

          }
          </FormField>
        } />

      <Button type="submit" fullWidth>
        {isVendor ? 'Confirm cash received' : 'Confirm I paid'}
      </Button>
      <ConfirmDialog
        open={c.pending !== null}
        title={isVendor ? `Cash received: ${formatNaira(c.pending ?? 0)}?` : `You paid ${formatNaira(c.pending ?? 0)}?`}
        description={`This can’t be changed afterwards. If ${otherName} confirms a different amount, Gwani’s team will review it.`}
        confirmLabel={isVendor ? 'Yes, I received it' : 'Yes, I paid it'}
        cancelLabel="Go back"
        loading={c.saving}
        onConfirm={() => void c.confirm()}
        onCancel={c.cancel} />

    </form>);

}
