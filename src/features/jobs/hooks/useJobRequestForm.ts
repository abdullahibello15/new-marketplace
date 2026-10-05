import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { usePhotoListField } from '../../../hooks/usePhotoListField';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { placeLabel } from '../../discovery/constants';
import { usePlace } from '../../discovery/hooks/usePlace';
import { detectCurrentPlace, listPlaces } from '../../discovery/services/placeService';
import { JOB_PHOTOS_MAX } from '../constants';
import { makeJobRequestSchema, type JobRequestFormData, type JobRequestFormValues } from '../schemas';
import { createJobRequest } from '../services/jobService';
import type { Vendor } from '../../../types/marketplace';
import type { Job } from '../types';

const NO_PHOTOS: string[] = [];

/** State for the job request form: validation (RHF + Zod), the area list, mock location, and submit. */
export function useJobRequestForm(vendor: Vendor) {
  const toast = useToast();
  const { place } = usePlace();
  const places = useAsyncData(listPlaces);
  const [created, setCreated] = useState<Job | null>(null);
  const [locating, setLocating] = useState(false);

  const schema = useMemo(() => makeJobRequestSchema({ workingHours: vendor.workingHours, vendorName: vendor.name }), [vendor]);
  const form = useForm<JobRequestFormValues, unknown, JobRequestFormData>({
    resolver: zodResolver(schema),
    // Start from the area the customer already chose on the home screen.
    defaultValues: { serviceName: '', description: '', photos: [], preferredDate: '', landmark: '', placeId: place.id, coordinates: null }
  });

  // Photo previews live here, not in the field, because this hook outlives the form: once a request is
  // sent, its photos are marked as kept so leaving the confirmation screen doesn't revoke them.
  const photoValue = useWatch({ control: form.control, name: 'photos' });
  const photos = usePhotoListField(
    photoValue,
    (next) => form.setValue('photos', next, { shouldDirty: true, shouldValidate: form.formState.isSubmitted }),
    created?.photos ?? NO_PHOTOS,
    JOB_PHOTOS_MAX
  );

  const submit = form.handleSubmit(
    async (data) => {
      const chosen = places.data?.find((p) => p.id === data.placeId);
      if (!chosen) {
        form.setError('placeId', { message: 'Choose your town or LGA.' }, { shouldFocus: true });
        return;
      }
      try {
        const job = await createJobRequest({
          vendorId: vendor.id,
          serviceName: data.serviceName || null,
          description: data.description,
          photos: data.photos,
          preferredDate: data.preferredDate,
          timeWindow: data.timeWindow,
          address: { landmark: data.landmark, placeId: chosen.id, placeLabel: placeLabel(chosen), lga: chosen.lga, coordinates: data.coordinates }
        });
        setCreated(job);
        toast.success(`Request sent to ${vendor.name}.`);
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    () => toast.error('Some details need fixing before you can send the request.')
  );

  /** MOCK: the real version would use navigator.geolocation; see placeService.detectCurrentPlace. */
  async function detectLocation() {
    setLocating(true);
    try {
      const found = await detectCurrentPlace();
      form.setValue('placeId', found.id, { shouldDirty: true, shouldValidate: true });
      form.setValue('coordinates', found.coordinates, { shouldDirty: true });
      toast.success(`Area set to ${placeLabel(found)}. Add your street or a landmark too.`);
    } catch (e) {
      toast.error(errorMessage(e, 'We couldn’t find your location. Choose your area from the list.'));
    } finally {
      setLocating(false);
    }
  }

  return { form, submit, created, places, photos, locating, detectLocation };
}
