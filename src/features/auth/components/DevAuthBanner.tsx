import { useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_AUTH, MOCK_OTP_CODE } from '../config';
import { devOutbox, subscribeDevOutbox } from '../services/authBackend';

function Banner() {
  const messages = useSyncExternalStore(subscribeDevOutbox, devOutbox, devOutbox);
  const [open, setOpen] = useState(false);
  const latest = messages[0];
  return (
    <aside aria-label="Dev sign-in helper" className="fixed bottom-24 right-3 z-50 max-w-xs rounded-xl border border-dashed border-mustard bg-[#FBF3DC] p-3 text-xs text-ink shadow-lg lg:bottom-4 print:hidden">
      <p>
        <strong>DEV mock sign-in.</strong> Code: <code className="font-bold">{MOCK_OTP_CODE}</code>
      </p>
      {latest &&
      <p className="mt-1">
          Last: {latest.text}
          {latest.kind === 'reset_link' && <> <Link to={latest.value} className="font-bold text-pine underline">Open reset link</Link></>}
        </p>
      }
      {messages.length > 1 &&
      <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 font-semibold text-pine underline" aria-expanded={open}>
          {open ? 'Hide' : 'Show'} recent messages
        </button>
      }
      {open &&
      <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">
          {messages.slice(1).map((m) => <li key={m.id}>{m.to}: {m.text}</li>)}
        </ul>
      }
    </aside>);

}

/**
 * DEV ONLY: shows the test code and the codes/links the mock backend "sent" (SMS, email). Renders nothing
 * unless MOCK_AUTH is on, which is impossible in a production build (see config.ts).
 */
export function DevAuthBanner() {
  return MOCK_AUTH ? <Banner /> : null;
}
