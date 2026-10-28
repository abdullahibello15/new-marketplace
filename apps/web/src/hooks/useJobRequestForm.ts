import React, { useRef, useState } from 'react';
import { format, addDays } from 'date-fns';

export interface PhotoItem {
  id: string;
  url: string;
}

export interface JobRequestValues {
  description: string;
  date: string;
  time: string;
  address: string;
}

type Errors = Partial<Record<keyof JobRequestValues, string>>;

export const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export function useJobRequestForm(defaultAddress: string) {
  const [values, setValues] = useState<JobRequestValues>({
    description: '',
    date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    time: '10:00',
    address: defaultAddress
  });
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setField<K extends keyof JobRequestValues>(key: K, value: JobRequestValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - photos.length);
    const next = files.map((f) => ({ id: `${f.name}-${f.lastModified}-${Math.random()}`, url: URL.createObjectURL(f) }));
    setPhotos((prev) => [...prev, ...next]);
    e.target.value = '';
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  function validate(): boolean {
    const next: Errors = {};
    if (values.description.trim().length < 10) next.description = 'Describe the job in a few words (at least 10 characters).';
    if (!values.date) next.date = 'Pick a date.';
    if (!values.address.trim()) next.address = 'Add an address or landmark.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  return {
    values,
    photos,
    errors,
    submitting,
    setSubmitting,
    fileInputRef,
    setField,
    handleFiles,
    removePhoto,
    validate,
    scheduledAt: new Date(`${values.date}T${values.time}:00`).toISOString()
  };
}