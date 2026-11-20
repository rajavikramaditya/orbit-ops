'use client';

import type { ReactNode } from 'react';

/**
 * @deprecated Role unlock now lives on CloudGate (single login page).
 * Kept as a pass-through so any leftover imports do not reintroduce a mid-gate.
 */
export function RoleGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
