import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { makeBookingSchema, type BookingFormData, type BookingFormValues } from '../schemas';
import { requestBooking } from '../services/publicProfileService';
import type { Vendor } from '../../../types/marketplace';
import type { BookableItem, BookingConfirmation } from '../types';

/** Booking/request form state: validation against the vendor's hours, mock submit, then a confirmation. */
export function useBookingForm(vendor: Vendor, items: BookableItem[]) {
  const toast = useToast();
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const schema = useMemo(
    () => makeBookingSchema({ items, workingHours: vendor.workingHours, vendorName: vendor.name }),
    [items, vendor.workingHours, vendor.name]
  );

  const form = useForm<BookingFormValues, unknown, BookingFormData>({
    resolver: zodResolver(schema),
    // Pre-select the only option when there is just one.
    defaultValues: { itemId: items.length === 1 ? items[0].id : '', date: '', time: '', message: '' }
  });

  const submit = form.handleSubmit(async (data) => {
    try {
      const result = await requestBooking(vendor.id, data);
      setConfirmation(result);
      toast.success(`Request sent to ${vendor.name}.`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  });

  return { form, submit, confirmation };
}
