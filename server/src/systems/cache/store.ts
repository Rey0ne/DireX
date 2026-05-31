/* === Cache — Simple memory store === */
const store = new Map<string, { value: any; expiry: number }>();

export function cacheGet(key: string): any | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) { store.delete(key); return undefined; }
  return entry.value;
}

export function cacheSet(key: string, value: any, ttlMs: number = 60000): void {
  store.set(key, { value, expiry: Date.now() + ttlMs });
}

export function cacheDel(key: string): void {
  store.delete(key);
}
