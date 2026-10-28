import { z } from 'zod';
import i18n from '../../i18n';
import { sanitizeText } from '../../lib/sanitize';
import { isNigerianMobile } from '../../utils/phone';
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
    min(REVIEW_REPLY_MIN, { error: () => i18n.t('vendor:form.replyFirst') }).
    max(REVIEW_REPLY_MAX, { error: () => i18n.t('vendor:form.replyMax', { max: REVIEW_REPLY_MAX }) })
  )
});

export type ReviewReplyFormValues = z.input<typeof reviewReplySchema>;
export type ReviewReplyData = z.output<typeof reviewReplySchema>;

export const reportReviewSchema = z.
object({
  reason: z.enum(REPORT_REASON, { error: () => i18n.t('jobs:form.chooseReason') }),
  details: cleanText.pipe(z.string().max(REPORT_DETAILS_MAX, { error: () => i18n.t('jobs:form.keepTo', { max: REPORT_DETAILS_MAX }) }))
}).
refine((v) => v.reason !== REPORT_REASON.Other || v.details.length >= REPORT_DETAILS_MIN, {
  path: ['details'],
  error: () => i18n.t('vendor:form.reportMin', { min: REPORT_DETAILS_MIN })
});

export type ReportReviewFormValues = z.input<typeof reportReviewSchema>;
export type ReportReviewData = z.output<typeof reportReviewSchema>;

/* ---------- Trade association: add a member ---------- */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Add a member by their Gwani phone number or email. */
export const addMemberSchema = z.object({
  contact: z.
  string().
  transform((v) => v.trim()).
  refine((v) => v.length > 0, { error: () => i18n.t('vendor:form.memberRequired') }).
  refine((v) => v.includes('@') ? EMAIL_PATTERN.test(v) : isNigerianMobile(v), { error: () => i18n.t('vendor:form.memberContact') })
});

export type AddMemberFormValues = z.input<typeof addMemberSchema>;
export type AddMemberFormData = z.output<typeof addMemberSchema>;
