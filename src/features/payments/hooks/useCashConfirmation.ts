import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { formatNumberInput } from '../../../lib/numberInput';
import { formatNaira } from '../../../utils/format';
import { JOB_ACTOR } from '../../jobs/constants';
import { PAYMENT_STATUS } from '../constants';
import { makeCashAmountSchema, type CashAmountFormData, type CashAmountFormValues } from '../schemas';
import { confirmCashPaid, confirmCashReceived } from '../services/paymentService';
import type { JobParty } from '../../jobs/types';
import type { Payment } from '../types';

/**
 * One side's cash confirmation: "Cash received ₦X" (vendor) or "I paid ₦X" (customer). The amount is
 * checked first, then confirmed in a dialog, because it can't be changed afterwards.
 */
export function useCashConfirmation(payment: Payment, party: JobParty, onUpdated: (p: Payment) => void) {
  const toast = useToast();
  const schema = useMemo(() => makeCashAmountSchema(payment.amount), [payment.amount]);
  const form = useForm<CashAmountFormValues, unknown, CashAmountFormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount: formatNumberInput(payment.amount) }
  });
  const [pending, setPending] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const review = form.handleSubmit((data) => setPending(data.amount));

  async function confirm() {
    if (pending === null || saving) return;
    setSaving(true);
    try {
      const updated = await (party === JOB_ACTOR.Vendor ? confirmCashReceived : confirmCashPaid)(payment.reference, pending);
      onUpdated(updated);
      toast.success(
        updated.status === PAYMENT_STATUS.Paid ?
        `Both sides confirmed ${formatNaira(pending)}. Payment complete.` :
        updated.reviewFlag ?
        'The amounts don’t match, so Gwani’s team will review it.' :
        `Thanks. Waiting for the ${party === JOB_ACTOR.Vendor ? 'customer' : 'vendor'} to confirm.`
      );
      setPending(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return { form, review, pending, saving, confirm, cancel: () => setPending(null) };
}
