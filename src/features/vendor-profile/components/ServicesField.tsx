import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { PlusIcon } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { errorText } from '../../../components/vendor/formStyles';
import { SERVICES_MAX } from '../constants';
import { emptyService, isNewService } from '../utils/profileForm';
import { ServiceFieldset } from './ServiceFieldset';
import type { ProfileFormData, ProfileFormValues } from '../types';

export function ServicesField() {
  const {
    control,
    getValues,
    formState: { errors }
  } = useFormContext<ProfileFormValues, unknown, ProfileFormData>();
  // keyName keeps RHF's internal key separate from each service's own `id`.
  const { fields, append, remove } = useFieldArray({ control, name: 'services', keyName: 'key' });
  const [pendingRemove, setPendingRemove] = useState<number | null>(null);

  function requestRemove(index: number) {
    // A service added in this session isn't public yet, so it can go without asking.
    if (isNewService(fields[index].id)) remove(index);else
    setPendingRemove(index);
  }

  const pendingName = pendingRemove === null ? '' : getValues(`services.${pendingRemove}.name`).trim() || 'this service';
  const listError = errors.services?.message ?? errors.services?.root?.message;

  return (
    <>
      {fields.length > 0 ?
      <ul className="space-y-3">
          {fields.map((f, index) =>
        <li key={f.key}>
              <ServiceFieldset index={index} onRemove={() => requestRemove(index)} />
            </li>
        )}
        </ul> :

      <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          No services yet. Customers can only book what you list here.
        </p>
      }
      {listError && <p className={errorText}>{listError}</p>}

      <Button
        variant="secondary"
        icon={PlusIcon}
        onClick={() => append(emptyService(), { shouldFocus: true })}
        disabled={fields.length >= SERVICES_MAX}
        className="mt-3">

        Add service
      </Button>

      <ConfirmDialog
        open={pendingRemove !== null}
        title={`Remove ${pendingName}?`}
        description="It comes off your profile when you save. Until then you can still discard your changes."
        confirmLabel="Remove service"
        destructive
        onConfirm={() => {
          if (pendingRemove !== null) remove(pendingRemove);
          setPendingRemove(null);
        }}
        onCancel={() => setPendingRemove(null)} />

    </>);

}
