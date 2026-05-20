export const ONLINE_PRESENCE_WINDOW_MS = 60 * 1000;

export function isOnlineFromLastSeen(
  lastSeenAt: Date | string | number | null | undefined,
  now = new Date(),
) {
  if (!lastSeenAt) {
    return false;
  }

  const lastSeenDate =
    lastSeenAt instanceof Date ? lastSeenAt : new Date(lastSeenAt);
  const lastSeenTime = lastSeenDate.getTime();

  if (Number.isNaN(lastSeenTime)) {
    return false;
  }

  return now.getTime() - lastSeenTime <= ONLINE_PRESENCE_WINDOW_MS;
}
