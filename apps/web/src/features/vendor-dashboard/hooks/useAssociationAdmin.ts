import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import i18n from '../../../i18n';
import { errorMessage } from '../../../lib/errors';
import { PAYMENT_SUBJECT } from '../../payments/constants';
import { DASHBOARD_ROUTES } from '../constants';
import { addMemberSchema, type AddMemberFormData, type AddMemberFormValues } from '../schemas';
import { addAssociationMember, getAssociationOverview, removeAssociationMember } from '../services/associationAdminService';
import { createBundleInvoice, listAssociationInvoices, simulateAssociationState, type DemoSubscriptionState } from '../services/subscriptionService';
import type { AssociationMember } from '../types';

/**
 * The association admin screen: members (add by phone or email, remove with confirmation), the bundle
 * total, paying the renewal or new members through the shared payment screen, and billing history.
 */
export function useAssociationAdmin(associationId: string) {
  const toast = useToast();
  const navigate = useNavigate();
  const loadOverview = useCallback(() => getAssociationOverview(associationId), [associationId]);
  const loadInvoices = useCallback(() => listAssociationInvoices(associationId), [associationId]);
  const overview = useAsyncData(loadOverview);
  const invoices = useAsyncData(loadInvoices);
  const [removing, setRemoving] = useState<AssociationMember | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const form = useForm<AddMemberFormValues, unknown, AddMemberFormData>({ resolver: zodResolver(addMemberSchema), defaultValues: { contact: '' } });

  const refresh = () => {
    overview.reload();
    invoices.reload();
  };

  const addMember = form.handleSubmit(async (data) => {
    try {
      const member = await addAssociationMember(associationId, data.contact);
      form.reset({ contact: '' });
      toast.success(i18n.t('vendor:association.toastAdded', { name: member.vendorName }));
      refresh();
    } catch (e) {
      form.setError('contact', { message: errorMessage(e) }, { shouldFocus: true });
    }
  });

  async function confirmRemove() {
    if (!removing || busy) return;
    setBusy('remove');
    try {
      const m = await removeAssociationMember(associationId, removing.id);
      toast.success(m.accessUntil ? i18n.t('vendor:association.toastRemovedAccess', { name: m.vendorName }) : i18n.t('vendor:association.toastRemoved', { name: m.vendorName }));
      setRemoving(null);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  /** Creates the bundle invoice (amount worked out by the server) and opens the payment screen. */
  async function pay(kind: 'renewal' | 'additions') {
    if (busy) return;
    setBusy(kind);
    try {
      const invoice = await createBundleInvoice(associationId, kind);
      navigate(DASHBOARD_ROUTES.pay(PAYMENT_SUBJECT.Subscription, invoice.id));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function simulate(state: DemoSubscriptionState) {
    setBusy('simulate');
    try {
      await simulateAssociationState(associationId, state);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return { overview, invoices, form, addMember, removing, askRemove: setRemoving, cancelRemove: () => setRemoving(null), confirmRemove, pay, simulate, busy };
}
