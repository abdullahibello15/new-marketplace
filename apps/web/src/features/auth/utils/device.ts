import { randomToken } from './random';

export interface DeviceInfo {
  /** A random id for this browser (not a fingerprint), to recognise it next time. */
  id: string;
  userAgent: string;
}

const DEVICE_KEY = 'gwani:device-id:v1';
let memoryDeviceId: string | null = null;

/**
 * This browser's device id and user agent. MOCK: a real backend identifies devices itself (IP, a signed
 * device cookie); a client-chosen id like this one can be reset by the user, so it's only a stand-in.
 */
export function currentDevice(): DeviceInfo {
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = randomToken(12);
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return { id, userAgent };
  } catch {
    return { id: memoryDeviceId ??= randomToken(12), userAgent };
  }
}

const BROWSERS: [RegExp, string][] = [
[/Edg\//, 'Edge'],
[/OPR\/|Opera/, 'Opera'],
[/SamsungBrowser/, 'Samsung Internet'],
[/Firefox\/|FxiOS/, 'Firefox'],
[/Chrome\/|CriOS/, 'Chrome'],
[/Safari\//, 'Safari']];

const SYSTEMS: [RegExp, string][] = [
[/Android/, 'Android'],
[/iPhone/, 'iPhone'],
[/iPad/, 'iPad'],
[/Windows/, 'Windows'],
[/Mac OS X|Macintosh/, 'Mac'],
[/CrOS/, 'ChromeOS'],
[/Linux/, 'Linux']];

/** "Chrome on Android" from a user agent; parts it can't tell are left as null for the UI to word. */
export function deviceParts(userAgent: string): {browser: string | null;system: string | null;} {
  return {
    browser: BROWSERS.find(([re]) => re.test(userAgent))?.[1] ?? null,
    system: SYSTEMS.find(([re]) => re.test(userAgent))?.[1] ?? null
  };
}

/** MOCK approximate locations (a real backend looks the IP up). Picked steadily from the device id. */
const MOCK_LOCATIONS = ['Minna, Niger State', 'Bida, Niger State', 'Suleja, Niger State', 'Kontagora, Niger State', 'Abuja, FCT'];

export function mockLocation(deviceId: string): string {
  let h = 0;
  for (const ch of deviceId) h = h * 31 + ch.charCodeAt(0) >>> 0;
  return MOCK_LOCATIONS[h % MOCK_LOCATIONS.length];
}

/** "Chrome on Android", in the reader's language (`t` from i18n). */
export function deviceDisplayName(userAgent: string, t: (key: string, values?: Record<string, unknown>) => string): string {
  const { browser, system } = deviceParts(userAgent);
  if (browser && system) return t('auth:sessions.deviceOn', { browser, system });
  return browser ?? system ?? t('auth:sessions.unknownDevice');
}
