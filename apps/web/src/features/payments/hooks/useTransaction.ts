import i18n from '../../../i18n';
import { useCallback } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { reportProblem } from '../../jobs/services/jobService';
import { reportOrderProblem } from '../../orders/services/orderService';
import { PAYMENT_SUBJECT } from '../constants';
import { getTransaction } from '../services/transactionService';
import type { ReportProblemFormData } from '../../jobs/schemas';

/** One transaction, and "Report a problem with this payment" through the job or order dispute flow. */
export function useTransaction(reference: string) {
  const toast = useToast();
  const load = useCallback(() => getTransaction(reference), [reference]);
  const detail = useAsyncData(load);

  /** Same action as the job or order page: it becomes Disputed and escrow holds the money. */
  const report = async (data: ReportProblemFormData): Promise<boolean> => {
    const subject = detail.data?.payment.subject;
    if (!subject) return false;
    try {
      await (subject.kind === PAYMENT_SUBJECT.Order ? reportOrderProblem(subject.id, data) : reportProblem(subject.id, data));
      toast.success(i18n.t('payments:tx.toastReported'));
      detail.reload();
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };

  return { ...detail, report };
}
