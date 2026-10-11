import { useTranslation } from 'react-i18next';
import { FlaskConicalIcon } from 'lucide-react';
import { MOCK_AUTH, MOCK_OTP_CODE } from '../config';

interface TestModeOtpBannerProps {
  onAutofill?: (code: string) => void;
  disabled?: boolean;
}

/**
 * DEV ONLY: "Test mode: use code 123456" on the code screen, with an optional autofill. Renders nothing
 * unless test mode is on (impossible in a production build; see config.ts). Autofill types the code like
 * a person would: it still goes through the normal check, so wrong codes, expiry and lockouts all apply.
 */
export function TestModeOtpBanner(props: TestModeOtpBannerProps) {
  return MOCK_AUTH ? <Banner {...props} /> : null;
}

function Banner({ onAutofill, disabled }: TestModeOtpBannerProps) {
  const { t } = useTranslation('auth');
  return (
    <div data-dev-only="otp-banner" role="note" className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-mustard bg-[#FBF3DC] px-3 py-2 text-sm">
      <FlaskConicalIcon className="h-4 w-4 shrink-0 text-mustard-dark" aria-hidden="true" />
      <span className="flex-1 font-semibold">{t('otp.testMode', { code: MOCK_OTP_CODE })}</span>
      {onAutofill &&
      <button type="button" disabled={disabled} onClick={() => onAutofill(MOCK_OTP_CODE)} className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-pine underline-offset-2 hover:underline disabled:opacity-50">
          {t('otp.autofill')}
        </button>
      }
    </div>);

}
