'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Role = 'owner' | 'manager' | 'team';

const RoleContext = createContext<{ role: Role; setRole: (r: Role) => void }>({ role: 'owner', setRole: () => {} });

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('owner');

  useEffect(() => {
    const r = localStorage.getItem('orbit-ops-role') as Role | null;
    if (r) setRoleState(r);
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    localStorage.setItem('orbit-ops-role', r);
  };

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export const useRole = () => useContext(RoleContext);
