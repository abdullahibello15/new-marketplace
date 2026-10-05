export const GENERIC_ERROR = 'Something went wrong. Please try again.';

export function errorMessage(error: unknown, fallback = GENERIC_ERROR): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
