/**
 * The store's mutable state, pinned to globalThis.
 *
 * Turbopack emits this store in more than one chunk, each with its own module
 * scope, and every copy reads and writes the same localStorage key. State kept
 * in a module would therefore exist once per copy. globalThis is shared by all
 * of them, so the cache and its subscribers live here.
 */
import type { AppData } from './store';

export const KEY = 'orbit-ops-data-v2';

type StoreState = {
  cache: AppData | null;
  /** Bumps on every write to KEY made through this page. */
  revision: number;
  /** The revision the cache currently mirrors. */
  epoch: number;
  hydrated: boolean;
  listeners: Set<() => void>;
};

const g = globalThis as unknown as { __orbitStore?: StoreState };

export const state: StoreState = (g.__orbitStore ??= {
  cache: null,
  revision: 0,
  epoch: -1,
  hydrated: false,
  listeners: new Set(),
});
