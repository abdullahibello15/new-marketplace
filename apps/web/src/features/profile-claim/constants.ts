/** The public "claim your profile" page. */
export const CLAIM_ROUTE = (token: string) => `/claim/${encodeURIComponent(token)}`;
