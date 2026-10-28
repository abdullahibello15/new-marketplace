import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('payments');
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
          label={isVendor ? t('cash.receivedLabel', { name: otherName }) : t('cash.paidLabel', { name: otherName })}
          hint={t('cash.hint', { amount: formatNaira(payment.amount) })}
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
        {isVendor ? t('cash.confirmReceived') : t('cash.confirmPaid')}
      </Button>
      <ConfirmDialog
        open={c.pending !== null}
        title={isVendor ? t('cash.receivedTitle', { amount: formatNaira(c.pending ?? 0) }) : t('cash.paidTitle', { amount: formatNaira(c.pending ?? 0) })}
        description={t('cash.dialogText', { name: otherName })}
        confirmLabel={isVendor ? t('cash.yesReceived') : t('cash.yesPaid')}
        cancelLabel={t('cash.goBack')}
        loading={c.saving}
        onConfirm={() => void c.confirm()}
        onCancel={c.cancel} />

    </form>);

}
