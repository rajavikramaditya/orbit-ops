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
  /** True once the first read has decided whether this browser already had records. */
  originChecked: boolean;
  /** localStorage already held records before this page seeded anything. */
  preexisting: boolean;
  listeners: Set<() => void>;
  /** Database is connected and this browser has the team key. */
  remote: boolean;
  /** A save that came from the server must not be pushed straight back. */
  applyingRemote: boolean;
  /** Owner PIN for this tab only. Never written to localStorage. */
  ownerPin: string;
  onSave?: (data: AppData) => void;
  applyRemote?: (data: AppData) => void;
};

const g = globalThis as unknown as { __orbitStore?: StoreState };

export const state: StoreState = (g.__orbitStore ??= {
  cache: null,
  revision: 0,
  epoch: -1,
  hydrated: false,
  originChecked: false,
  preexisting: false,
  listeners: new Set(),
  remote: false,
  applyingRemote: false,
  ownerPin: '',
});
