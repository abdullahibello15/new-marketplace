import { z } from 'zod';
import { sanitizeText } from '../../lib/sanitize';
import {
  REPORT_DETAILS_MAX,
  REPORT_DETAILS_MIN,
  REPORT_REASON,
  REVIEW_REPLY_MAX,
  REVIEW_REPLY_MIN } from
'./constants';

/** Free text, cleaned before length checks so whitespace-only input fails "required". */
const cleanText = z.string().transform(sanitizeText);

export const reviewReplySchema = z.object({
  body: cleanText.pipe(
    z.
    string().
    min(REVIEW_REPLY_MIN, 'Write your reply first.').
    max(REVIEW_REPLY_MAX, `Keep your reply to ${REVIEW_REPLY_MAX} characters or fewer.`)
  )
});

export type ReviewReplyFormValues = z.input<typeof reviewReplySchema>;
export type ReviewReplyData = z.output<typeof reviewReplySchema>;

export const reportReviewSchema = z.
object({
  reason: z.enum(REPORT_REASON, { error: 'Choose a reason.' }),
  details: cleanText.pipe(z.string().max(REPORT_DETAILS_MAX, `Keep it to ${REPORT_DETAILS_MAX} characters or fewer.`))
}).
refine((v) => v.reason !== REPORT_REASON.Other || v.details.length >= REPORT_DETAILS_MIN, {
  path: ['details'],
  message: `Tell us what’s wrong with this review (at least ${REPORT_DETAILS_MIN} characters).`
});

export type ReportReviewFormValues = z.input<typeof reportReviewSchema>;
export type ReportReviewData = z.output<typeof reportReviewSchema>;
