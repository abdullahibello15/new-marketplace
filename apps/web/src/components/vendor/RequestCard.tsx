import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2Icon } from 'lucide-react';
import { useVendorPortal } from '../../contexts/VendorPortalContext';
import type { VendorRequest } from '../../types/vendorPortal';

type Mode = 'idle' | 'quoting' | 'sending';

const ease = [0.23, 1, 0.32, 1] as const;

export function RequestCard({ request }: {request: VendorRequest;}) {
  const { sendQuote, declineRequest } = useVendorPortal();
  const [mode, setMode] = useState<Mode>('idle');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(/[^\d]/g, ''));
    if (!value || value < 500) {
      setError('Enter a quote of at least ₦500.');
      return;
    }
    setMode('sending');
    window.setTimeout(() => sendQuote(request.id, value, note.trim()), 600);
  }

  const amountInputId = `quote-${request.id}`;

  return (
    <article className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-ink lg:text-lg">New request — {request.customerName}</h3>
          <p className="mt-0.5 text-sm text-muted">
            {request.description} · {request.area} · {request.minutesAgo} min ago
          </p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-md bg-mustard px-2 py-0.5 text-xs font-bold text-ink">Awaiting quote</span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === 'idle' ?
        <motion.div
          key="actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="mt-4 grid grid-cols-2 gap-3">
          
            <button
            type="button"
            onClick={() => setMode('quoting')}
            className="rounded-xl bg-pine-deep px-4 py-3 text-[15px] font-bold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-pine active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-2">
            
              Send quote
            </button>
            <button
            type="button"
            onClick={() => declineRequest(request.id)}
            className="rounded-xl border border-line bg-white px-4 py-3 text-[15px] font-bold text-ink transition-[border-color,transform] duration-150 ease-out hover:border-ink/30 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
            
              Decline
            </button>
          </motion.div> :

        <motion.form
          key="quote"
          onSubmit={handleSubmit}
          noValidate
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease }}
          className="mt-4 space-y-3 border-t border-line pt-4">
          
            <div>
              <label htmlFor={amountInputId} className="mb-1.5 block text-sm font-bold text-muted">Fixed quote</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted" aria-hidden="true">₦</span>
                <input
                id={amountInputId}
                inputMode="numeric"
                autoFocus
                value={amount}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, '');
                  setAmount(digits ? Number(digits).toLocaleString('en-NG') : '');
                  setError('');
                }}
                placeholder="6,500"
                aria-invalid={Boolean(error)}
                className={`w-full rounded-xl border bg-white py-3 pl-9 pr-4 text-[15px] font-bold text-ink placeholder:font-medium placeholder:text-muted focus:outline-none focus:ring-2 ${
                error ? 'border-clay focus:ring-clay/20' : 'border-line focus:border-pine focus:ring-pine/20'}`
                } />
              
              </div>
              {error && <p className="mt-1.5 text-sm font-medium text-clay-dark">{error}</p>}
            </div>
            <div>
              <label htmlFor={`note-${request.id}`} className="mb-1.5 block text-sm font-bold text-muted">Note to customer (optional)</label>
              <input
              id={`note-${request.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Includes washer and labour"
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink placeholder:text-muted focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20" />
            
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
              type="button"
              onClick={() => setMode('idle')}
              disabled={mode === 'sending'}
              className="rounded-xl bg-sand px-4 py-3 text-[15px] font-bold text-ink transition-colors duration-150 hover:bg-line disabled:opacity-50">
              
                Cancel
              </button>
              <button
              type="submit"
              disabled={mode === 'sending'}
              className="flex items-center justify-center gap-2 rounded-xl bg-pine-deep px-4 py-3 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-pine disabled:cursor-wait disabled:opacity-80">
              
                {mode === 'sending' && <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {mode === 'sending' ? 'Sending…' : amount ? `Send ₦${amount}` : 'Send quote'}
              </button>
            </div>
          </motion.form>
        }
      </AnimatePresence>
    </article>);

}