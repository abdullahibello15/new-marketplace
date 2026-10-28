import { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Dialog } from '../../../../components/ui/Dialog';
import { FormField } from '../../../../components/ui/FormField';
import { bad, field, ok } from '../../../../components/vendor/formStyles';
import { normalizeNigerianPhone } from '../../../../utils/phone';
import { isEmail } from '../../../auth/services/authBackend';
import { ADMIN_ROLE, ADMIN_ROLES, type AdminRole } from '../../config/roles';
import type { InviteAdminInput } from '../../services/adminAccountService';

interface InviteAdminDialogProps {
  open: boolean;
  /** Resolves true when the invitation was created, so the dialog can close. */
  onConfirm: (input: InviteAdminInput) => Promise<boolean>;
  onCancel: () => void;
}

type Errors = Partial<Record<'name' | 'contact', string>>;

/** Invite a staff member by phone or email. They show as "Invited" until they accept. */
export function InviteAdminDialog({ open, onConfirm, onCancel }: InviteAdminDialogProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [role, setRole] = useState<AdminRole>(ADMIN_ROLE.Verifier);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setContact('');
      setRole(ADMIN_ROLE.Verifier);
      setErrors({});
    }
  }, [open]);

  async function submit() {
    const c = contact.trim();
    const next: Errors = {
      name: name.trim().length < 2 ? 'Enter their full name.' : undefined,
      contact: !c ? 'Enter a phone number or email.' : (c.includes('@') ? isEmail(c) : normalizeNigerianPhone(c)) ? undefined : 'Enter a Nigerian phone number (e.g. 0803 555 0142) or a valid email.'
    };
    setErrors(next);
    if (next.name || next.contact) return;
    setBusy(true);
    const done = await onConfirm({ name, contact: c, role });
    setBusy(false);
    if (done) onCancel();
  }

  return (
    <Dialog open={open} onClose={onCancel} dismissible={!busy} title="Invite an admin" description="They get a link to join the admin console. Until they accept, they show as Invited.">
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}>

        <FormField id="invite-name" label="Full name" error={errors.name}>
          {(describedBy) =>
          <input id="invite-name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={describedBy} className={`${field} ${errors.name ? bad : ok}`} />
          }
        </FormField>
        <FormField id="invite-contact" label="Phone number or email" hint="Where we send the invitation." error={errors.contact}>
          {(describedBy) =>
          <input id="invite-contact" autoComplete="off" value={contact} onChange={(e) => setContact(e.target.value)} aria-invalid={!!errors.contact} aria-describedby={describedBy} className={`${field} ${errors.contact ? bad : ok}`} />
          }
        </FormField>
        <FormField id="invite-role" label="Role" hint={ADMIN_ROLES[role].description}>
          {(describedBy) =>
          <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as AdminRole)} aria-describedby={describedBy} className={`${field} ${ok} py-2.5`}>
              {Object.entries(ADMIN_ROLES).map(([id, r]) =>
            <option key={id} value={id}>{r.label}</option>
            )}
            </select>
          }
        </FormField>
        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Send invitation
          </Button>
        </div>
      </form>
    </Dialog>);

}
