import {
  ONLINE_PRESENCE_WINDOW_MS,
  isOnlineFromLastSeen,
} from './presence';

describe('presence', () => {
  it('treats a recent heartbeat as online', () => {
    const now = new Date('2026-05-20T10:00:00.000Z');
    const lastSeenAt = new Date(now.getTime() - ONLINE_PRESENCE_WINDOW_MS + 1);

    expect(isOnlineFromLastSeen(lastSeenAt, now)).toBe(true);
  });

  it('treats a stale heartbeat as offline', () => {
    const now = new Date('2026-05-20T10:00:00.000Z');
    const lastSeenAt = new Date(now.getTime() - ONLINE_PRESENCE_WINDOW_MS - 1);

    expect(isOnlineFromLastSeen(lastSeenAt, now)).toBe(false);
  });
});
