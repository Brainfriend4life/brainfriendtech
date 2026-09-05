// ============================================================
// PROVIDER CACHE
//
// Simple in-memory cache with a TTL, used to stop the slow parts
// of provider plan-list endpoints (SMEPlug, NetworkDataSub,
// CheapDataHub) from re-running on every single page load.
// Before this, /api/data-plans, /api/networkdata/data-plans and
// /api/smeplug/data-plans were regularly taking 15-23 SECONDS per
// request, every request, because each one called the provider
// live with zero caching.
//
// USAGE:
//   const grouped = await getCached(
//     "smeplug-plans",
//     3 * 60 * 1000, // 3 minutes
//     async () => {
//       // ...slow provider fetch here...
//       return someData;
//     }
//   );
//
// Only cache the SLOW, mostly-static part (the provider's plan
// list). Anything that must be fresh on every request — like
// SMEPlug's unavailable-plan flags — should stay OUTSIDE the
// cached fetcher and be read live every time.
//
// CAVEAT: this cache lives in the server process's memory. On
// serverless platforms (Vercel and similar), each warm instance
// keeps its own copy, and a cold start clears it. That's still a
// large improvement for real traffic (most requests hit a warm
// instance), but it is NOT shared across every instance globally.
// If that's ever needed, swap the internals of this file for
// Redis/Upstash — getCached()'s signature below wouldn't need to
// change at any of its call sites.
// ============================================================

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export async function getCached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key) as
    | CacheEntry<T>
    | undefined;

  if (existing && existing.expiresAt > now) {
    return existing.value;
  }

  // If fetcher() throws, nothing is cached and the next call
  // will simply try again — a failed provider call never gets
  // "stuck" as a cached failure.
  const value = await fetcher();

  cache.set(key, {
    value,
    expiresAt: now + ttlMs,
  });

  return value;
}

// Manually clear a cached entry. Useful right after a purchase
// attempt if you want the very next plans fetch to be guaranteed
// fresh instead of waiting out the TTL.
export function invalidateCache(key: string): void {
  cache.delete(key);
}