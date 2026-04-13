export interface CacheEntry<T> {
  data: T;
  fetchedAt: Date;
}

export function isFresh(fetchedAt: Date, ttlHours: number): boolean {
  const ageMs = Date.now() - fetchedAt.getTime();
  return ageMs < ttlHours * 60 * 60 * 1_000;
}
