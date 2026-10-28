import type { SessionRecord } from '../services/sessionBackend';

/*
 * MOCK sessions the demo accounts already have on other devices, so the active sessions page has
 * something to sign out. Their token hashes are random: nobody can use them.
 */

const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
const unusable = (n: number) => `h$seed-${n}-${Math.random().toString(36).slice(2)}`;

function seed(id: string, userId: string, deviceId: string, userAgent: string, location: string, createdHoursAgo: number, activeHoursAgo: number): SessionRecord {
  return {
    id,
    userId,
    deviceId,
    userAgent,
    location,
    remember: true,
    staff: false,
    createdAt: ago(createdHoursAgo),
    lastActiveAt: ago(activeHoursAgo),
    expiresAt: inDays(20),
    refreshHash: unusable(1),
    oldRefreshHashes: [],
    access: [],
    endedAt: null,
    endReason: null
  };
}

export function seedSessions(): SessionRecord[] {
  return [
  seed('ses_seed_aisha_iphone', 'cust-aisha', 'seed-dev-aisha-iphone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1', 'Minna, Niger State', 24 * 9, 30),
  seed('ses_seed_aisha_laptop', 'cust-aisha', 'seed-dev-aisha-laptop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', 'Abuja, FCT', 24 * 4, 24 * 2),
  seed('ses_seed_bala_tecno', 'usr-bala', 'seed-dev-bala-android', 'Mozilla/5.0 (Linux; Android 13; TECNO KI5q) AppleWebKit/537.36 Chrome/125.0 Mobile Safari/537.36', 'Bida, Niger State', 24 * 12, 5)];

}
