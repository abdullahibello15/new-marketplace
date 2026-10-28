import { z } from 'zod'

// GET /healthz. A status report, not an error: 503 still uses this shape so load balancers and people
// can see which dependency is down.
export const healthCheckStatusSchema = z.enum(['ok', 'down'])

export const healthResponseSchema = z.strictObject({
  status: z.enum(['ok', 'unavailable']),
  checks: z.record(z.string(), healthCheckStatusSchema),
})
export type HealthResponse = z.infer<typeof healthResponseSchema>
