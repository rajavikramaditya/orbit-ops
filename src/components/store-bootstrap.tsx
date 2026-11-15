'use client';

import { useState } from 'react';
import { hydrate } from '@/lib/store';
import '@/lib/sync';

/**
 * Reads localStorage into the store before the rest of the tree renders, so the
 * first paint already has data and no page needs an effect to load it.
 * Rendered from the root layout, which mounts exactly once per page.
 */
export function StoreBootstrap({ children }: { children: React.ReactNode }) {
  useState(() => {
    if (typeof window !== 'undefined') {
      hydrate();
      // Ask the browser not to evict this data under storage pressure.
      try { navigator.storage?.persist?.(); } catch {}
    }
    return true;
  });
  return <>{children}</>;
}
