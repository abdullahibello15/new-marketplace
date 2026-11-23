import { z } from 'zod'

export const REVIEW_REPLY_MIN_LENGTH = 2
export const REVIEW_REPLY_MAX_LENGTH = 500

export const reviewParamsSchema = z.object({ reviewId: z.string().uuid() }).strict()

/** POST /v1/vendors/me/reviews/:reviewId/reply */
export const reviewReplySchema = z
  .object({ body: z.string().trim().min(REVIEW_REPLY_MIN_LENGTH).max(REVIEW_REPLY_MAX_LENGTH) })
  .strict()
export type ReviewReplyInput = z.input<typeof reviewReplySchema>
