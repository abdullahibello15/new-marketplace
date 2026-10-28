import { Redis } from 'ioredis'
import type { Logger } from 'pino'

/**
 * The API's Redis client. Commands fail fast while disconnected (no offline queue), so a Redis outage
 * shows up in /healthz and in requests instead of hanging them.
 */
export function createRedis(url: string, logger: Logger): Redis {
  const redis = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false })
  redis.on('error', (err) => logger.warn({ err }, 'redis connection error'))
  return redis
}
