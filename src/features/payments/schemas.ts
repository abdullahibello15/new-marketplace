import { z } from 'zod';
import { parseNumberInput } from '../../lib/numberInput';

/** The cash amount one side confirms: whole Naira, more than 0, and not absurdly above what was owed. */
export function makeCashAmountSchema(owed: number) {
  return z.object({
    amount: z.string().transform((raw, ctx) => {
      const value = parseNumberInput(raw);
      if (value === null || Number.isNaN(value) || value <= 0) {
        ctx.addIssue({ code: 'custom', message: 'Enter the amount in whole Naira, like 8,000.' });
        return z.NEVER;
      }
      if (value > owed * 10) {
        ctx.addIssue({ code: 'custom', message: 'That looks too high. Check for extra zeros.' });
        return z.NEVER;
      }
      return value;
    })
  });
}

export type CashAmountFormValues = z.input<ReturnType<typeof makeCashAmountSchema>>;
export type CashAmountFormData = z.output<ReturnType<typeof makeCashAmountSchema>>;
