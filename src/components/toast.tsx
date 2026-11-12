'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type Toast = { id: number; text: string; kind: 'ok' | 'info' };

const Ctx = createContext<(text: string, kind?: Toast['kind']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = ++seq.current;
    setItems(xs => [...xs, { id, text, kind }]);
    setTimeout(() => setItems(xs => xs.filter(x => x.id !== id)), 2600);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 md:bottom-6 z-[70] flex flex-col items-center gap-2 px-4">
        {items.map(t => (
          <div key={t.id} className={cn('animate-rise flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-sm shadow-float')}>
            {t.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
