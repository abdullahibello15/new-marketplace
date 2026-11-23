/**
 * The platform's name: THE one place to change it. Written exactly like this (all capitals) in every
 * language: it is never translated. Code imports APP_NAME; translations use {{appName}} (filled in by
 * i18n/index.ts); index.html uses %APP_NAME% (filled in by vite.config.ts).
 */
export const APP_NAME = 'ZAMANI NG MARKET HUB';

/** The letter in the round/square logo badge. */
export const APP_INITIAL = APP_NAME.charAt(0);

/** Start of downloaded file names (receipts, CSV exports, templates), e.g. "zamani-receipt-GW-123.pdf". */
export const APP_FILE_PREFIX = 'zamani';
