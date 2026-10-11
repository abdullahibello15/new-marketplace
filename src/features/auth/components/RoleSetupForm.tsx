import { useId, useState, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { field, label as labelClass, ok } from '../../../components/vendor/formStyles';
import { nigerLgas } from '../../../data/nigerLgas';
import { OTHER_TRADE, tradeCategories } from '../../../data/tradeCategories';
import { lgaLabel, roleDescription, tradeLabel } from '../../../i18n/labels';
import { AUTH_ROUTES, RIDER_VEHICLES, ROLE, ROLE_META, type RiderVehicle, type SignupRole } from '../constants';
import type { NigerLga, TradeCategory } from '../../../types/marketplace';
import type { RiderSetupInput, VendorSetupInput } from '../types';

export interface RoleSetupValues {
  name: string;
  email: string;
  vendor?: VendorSetupInput;
  rider?: RiderSetupInput;
}

interface RoleSetupFormProps {
  role: SignupRole;
  /** Rider signup asks for their name; adding a role later doesn't. */
  askName: boolean;
  /**
   * Vendor setup after provider signup: only the business (type, name, trade). The location and the
   * provider terms were given at signup, so those fields are left out.
   */
  businessOnly?: boolean;
  submitLabel: string;
  onSubmit: (values: RoleSetupValues) => Promise<void>;
  onBack?: () => void;
}

const input = `${field} ${ok}`;

/**
 * The short setup for a role: providers their business (name, service or retail, trade, and, when adding
 * the role later, LGA/town and the provider terms), riders their name, area and vehicle.
 */
export function RoleSetupForm({ role, askName, businessOnly = false, submitLabel, onSubmit, onBack }: RoleSetupFormProps) {
  const { t } = useTranslation('auth');
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'service' | 'retail'>('service');
  const [businessName, setBusinessName] = useState('');
  const [trade, setTrade] = useState<TradeCategory | ''>('');
  const [lga, setLga] = useState<NigerLga | ''>('');
  const [town, setTown] = useState('');
  const [terms, setTerms] = useState(false);
  const [vehicle, setVehicle] = useState<RiderVehicle | ''>('');
  const [plate, setPlate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const trades = tradeCategories.filter((c) => c.kind === kind);

  function problem(): string | null {
    if (askName && name.trim().length < 2) return t('setup.check.name');
    if (role === ROLE.Provider) {
      if (businessName.trim().length < 2) return t('setup.check.businessName');
      if (!trade) return t('setup.check.trade');
      if (businessOnly) return null;
      if (!lga) return t('setup.check.lga');
      if (town.trim().length < 2) return t('setup.check.town');
      if (!terms) return t('setup.check.terms');
    }
    if (role === ROLE.Rider) {
      if (!lga) return t('setup.check.lga');
      if (town.trim().length < 2) return t('setup.check.town');
      if (!vehicle) return t('setup.check.vehicle');
    }
    return null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const p = problem();
    setError(p);
    if (p) return;
    setSaving(true);
    try {
      await onSubmit({
        name,
        email: '',
        vendor: role === ROLE.Provider ? { kind, businessName, tradeCategory: trade as TradeCategory, lga: lga as NigerLga, town, acceptedTerms: terms } : undefined,
        rider: role === ROLE.Rider ? { lga: lga as NigerLga, town, vehicle: vehicle as RiderVehicle, plateNumber: plate.trim() || null } : undefined
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:error.generic'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t(`setup.title.${role}`)}</h1>
      <p className="text-sm text-muted">{roleDescription(role, ROLE_META[role].description)}</p>

      {askName &&
      <div>
          <label htmlFor={id('name')} className={labelClass}>{t('setup.yourName')}</label>
          <input id={id('name')} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={input} autoFocus />
        </div>
      }

      {role === ROLE.Provider &&
      <>
          <fieldset>
            <legend className={labelClass}>{t('setup.kindLegend')}</legend>
            <div className="grid grid-cols-2 gap-2">
              {([['service', t('setup.kind.service'), t('setup.kind.serviceHint')], ['retail', t('setup.kind.retail'), t('setup.kind.retailHint')]] as const).map(([value, label, hint]) =>
            <label key={value} className={`cursor-pointer rounded-xl border-2 p-3 ${kind === value ? 'border-pine bg-[#E3EEEC]' : 'border-line'}`}>
                  <input
                type="radio"
                name={id('kind')}
                value={value}
                checked={kind === value}
                onChange={() => {
                  setKind(value);
                  setTrade('');
                }}
                className="sr-only" />

                  <span className="block font-bold">{label}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </label>
            )}
            </div>
          </fieldset>
          <div>
            <label htmlFor={id('biz')} className={labelClass}>{t('setup.businessName')}</label>
            <input id={id('biz')} autoComplete="organization" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={id('trade')} className={labelClass}>{t('setup.trade')}</label>
            <select id={id('trade')} value={trade} onChange={(e) => setTrade(e.target.value as TradeCategory)} className={input}>
              <option value="" disabled>{t('setup.chooseTrade')}</option>
              {trades.map((c) => <option key={c.id} value={c.id}>{tradeLabel(c.id)}</option>)}
              {kind === 'service' && <option value={OTHER_TRADE}>{tradeLabel(OTHER_TRADE)}</option>}
            </select>
          </div>
        </>
      }

      {role !== ROLE.Customer && !businessOnly &&
      <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={id('lga')} className={labelClass}>{t('setup.lga')}</label>
            <select id={id('lga')} value={lga} onChange={(e) => setLga(e.target.value as NigerLga)} className={input}>
              <option value="" disabled>{t('setup.chooseLga')}</option>
              {nigerLgas.map((l) => <option key={l} value={l}>{lgaLabel(l)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={id('town')} className={labelClass}>{t('setup.town')}</label>
            <input id={id('town')} placeholder={t('setup.townPlaceholder')} value={town} onChange={(e) => setTown(e.target.value)} className={input} />
          </div>
        </div>
      }

      {role === ROLE.Rider &&
      <>
          <fieldset>
            <legend className={labelClass}>{t('setup.vehicle')}</legend>
            <div className="grid grid-cols-2 gap-2">
              {RIDER_VEHICLES.map((v) =>
            <label key={v.id} className={`cursor-pointer rounded-xl border-2 p-3 text-sm font-semibold ${vehicle === v.id ? 'border-pine bg-[#E3EEEC]' : 'border-line'}`}>
                  <input type="radio" name={id('vehicle')} value={v.id} checked={vehicle === v.id} onChange={() => setVehicle(v.id)} className="sr-only" />
                  {t(`common:vehicle.${v.id}`)}
                </label>
            )}
            </div>
          </fieldset>
          <div>
            <label htmlFor={id('plate')} className={labelClass}>{t('setup.plate')} <span className="font-normal">({t('common:state.optional')})</span></label>
            <input id={id('plate')} value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder={t('setup.platePlaceholder')} className={input} />
          </div>
        </>
      }

      {role === ROLE.Provider && !businessOnly &&
      <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line text-pine focus:ring-pine/40" />
          <span>
            <Trans t={t} i18nKey="setup.terms" components={{ termsLink: <Link to={AUTH_ROUTES.providerTerms} target="_blank" className="font-semibold text-pine underline underline-offset-2" /> }} />
          </span>
        </label>
      }

      {error && <p role="alert" className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">{error}</p>}
      <div className="flex gap-2">
        {onBack && <Button variant="secondary" onClick={onBack} disabled={saving}>{t('common:action.back')}</Button>}
        <Button type="submit" fullWidth loading={saving}>{submitLabel}</Button>
      </div>
    </form>);

}
