// Fix: Node.js 25 + Next.js 15 passes --localstorage-file without a valid path,
// making localStorage present-but-broken in server rendering workers.
// Patch it with a safe no-op Map-backed store before any page renders.
export async function register() {
  if (typeof globalThis.localStorage !== 'undefined') {
    try {
      globalThis.localStorage.getItem('__probe__')
    } catch {
      // localStorage is broken — replace with in-memory shim
      const store = new Map<string, string>()
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, val: string) => store.set(key, String(val)),
          removeItem: (key: string) => store.delete(key),
          clear: () => store.clear(),
          key: (i: number) => Array.from(store.keys())[i] ?? null,
          get length() { return store.size },
        },
      })
    }
  }
}
