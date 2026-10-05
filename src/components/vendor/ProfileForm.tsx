import { useState } from 'react';
import { ProfileSection } from './ProfileSection';
import { bad, errorText, field, label, ok } from './formStyles';
import { BIO_MAX_LENGTH, TRADE_OTHER_MAX_LENGTH, tradeCategories } from '../../data/tradeCategories';
import type { TradeCategory, VendorProfileInput } from '../../types/marketplace';

export interface ProfileDraft {
  bio: string;
  tradeCategory: TradeCategory | '';
  tradeCategoryOther: string;
}

interface ProfileFormProps {
  initial: VendorProfileInput;
  onChange: (draft: ProfileDraft) => void;
  onSave: (input: VendorProfileInput) => void;
}

type Errors = Partial<Record<keyof ProfileDraft, string>>;

function validate(draft: ProfileDraft): Errors {
  const next: Errors = {};
  if (!draft.tradeCategory) next.tradeCategory = 'Choose the trade customers will find you under.';
  if (draft.tradeCategory === 'other') {
    const other = draft.tradeCategoryOther.trim();
    if (!other) next.tradeCategoryOther = 'Tell customers what your trade is.';else
    if (other.length > TRADE_OTHER_MAX_LENGTH) next.tradeCategoryOther = `Keep it under ${TRADE_OTHER_MAX_LENGTH} characters.`;
  }
  if (draft.bio.trim().length > BIO_MAX_LENGTH) {
    next.bio = `Your bio is ${draft.bio.trim().length - BIO_MAX_LENGTH} characters too long. Keep it to ${BIO_MAX_LENGTH}.`;
  }
  return next;
}

export function ProfileForm({ initial, onChange, onSave }: ProfileFormProps) {
  const [draft, setDraft] = useState<ProfileDraft>({
    bio: initial.bio ?? '',
    tradeCategory: initial.tradeCategory,
    tradeCategoryOther: initial.tradeCategoryOther ?? ''
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState(false);

  function setField<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onChange(next);
    setSaved(false);
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleSubmit() {
    const next = validate(draft);
    setErrors(next);
    if (Object.keys(next).length || !draft.tradeCategory) return;
    const bio = draft.bio.trim();
    onSave({
      bio: bio || undefined,
      tradeCategory: draft.tradeCategory,
      tradeCategoryOther: draft.tradeCategory === 'other' ? draft.tradeCategoryOther.trim() : undefined
    });
    setSaved(true);
  }

  const bioLength = draft.bio.trim().length;
  const overLimit = bioLength > BIO_MAX_LENGTH;

  return (
    <ProfileSection
      id="profile-about"
      title="About"
      description="Your trade and a short intro customers see under your name."
      saveLabel="Save details"
      saved={saved}
      onSubmit={handleSubmit}>

      <div className="grid gap-4">
        <div>
          <label htmlFor="profile-trade" className={label}>
            Trade category <span className="text-clay-dark" aria-hidden="true">*</span>
          </label>
          <select
            id="profile-trade"
            required
            value={draft.tradeCategory}
            onChange={(e) => setField('tradeCategory', e.target.value as TradeCategory | '')}
            aria-invalid={Boolean(errors.tradeCategory)}
            aria-describedby={errors.tradeCategory ? 'profile-trade-error' : undefined}
            className={`${field} ${errors.tradeCategory ? bad : ok}`}>

            <option value="" disabled>Choose your trade</option>
            {tradeCategories.map((t) =>
            <option key={t.id} value={t.id}>{t.label}</option>
            )}
          </select>
          {errors.tradeCategory && <p id="profile-trade-error" className={errorText}>{errors.tradeCategory}</p>}
        </div>

        {draft.tradeCategory === 'other' &&
        <div>
            <label htmlFor="profile-trade-other" className={label}>
              Your trade <span className="text-clay-dark" aria-hidden="true">*</span>
            </label>
            <input
            id="profile-trade-other"
            required
            autoFocus
            value={draft.tradeCategoryOther}
            onChange={(e) => setField('tradeCategoryOther', e.target.value)}
            placeholder="e.g. Welder, AC technician"
            aria-invalid={Boolean(errors.tradeCategoryOther)}
            aria-describedby={errors.tradeCategoryOther ? 'profile-trade-other-error' : undefined}
            className={`${field} ${errors.tradeCategoryOther ? bad : ok}`} />

            {errors.tradeCategoryOther &&
          <p id="profile-trade-other-error" className={errorText}>{errors.tradeCategoryOther}</p>
          }
          </div>
        }

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor="profile-bio" className="block text-sm font-bold text-muted">
              Bio <span className="font-medium">(optional)</span>
            </label>
            <span
              id="profile-bio-count"
              aria-live="polite"
              className={`text-xs font-semibold tabular-nums ${overLimit ? 'text-clay-dark' : 'text-muted'}`}>

              {bioLength}/{BIO_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id="profile-bio"
            rows={5}
            value={draft.bio}
            onChange={(e) => setField('bio', e.target.value)}
            placeholder="Tell customers about your experience, the areas you cover and what makes your work stand out."
            aria-invalid={Boolean(errors.bio)}
            aria-describedby={errors.bio ? 'profile-bio-count profile-bio-error' : 'profile-bio-count'}
            className={`${field} resize-y ${errors.bio || overLimit ? bad : ok}`} />

          {errors.bio && <p id="profile-bio-error" className={errorText}>{errors.bio}</p>}
        </div>
      </div>
    </ProfileSection>);

}
