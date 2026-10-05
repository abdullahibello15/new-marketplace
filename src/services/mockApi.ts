/**
 * The seam between mock data and a real backend. Every service resolves through `mockResponse`, so
 * swapping a service body for a `fetch` call later doesn't change any caller: they already await a
 * Promise and handle errors.
 */
const MOCK_LATENCY_MS = 450;

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Resolves with a deep copy of what `produce` returns after a short delay, like a network round trip.
 * The copy stops callers from mutating the in-memory "database". Throwing inside `produce` rejects,
 * like an error response.
 */
export function mockResponse<T>(produce: () => T, latencyMs = MOCK_LATENCY_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      try {
        resolve(structuredClone(produce()));
      } catch (error) {
        reject(error instanceof Error ? error : new ApiError('Something went wrong. Please try again.'));
      }
    }, latencyMs);
  });
}
