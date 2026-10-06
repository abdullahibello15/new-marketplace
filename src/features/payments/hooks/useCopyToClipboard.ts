import { useState } from 'react';
import { useToast } from '../../../hooks/useToast';

/** Copies text and confirms it. Older phones without the Clipboard API get a hint to copy by hand. */
export function useCopyToClipboard() {
  const toast = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(text: string, what: string) {
    try {
      if (!navigator.clipboard) throw new Error('unsupported');
      await navigator.clipboard.writeText(text);
      setCopied(what);
      toast.success(`${what} copied.`);
      window.setTimeout(() => setCopied((c) => c === what ? null : c), 2000);
    } catch {
      toast.error(`Couldn’t copy. Press and hold the ${what.toLowerCase()} to copy it.`);
    }
  }

  return { copy, copied };
}
