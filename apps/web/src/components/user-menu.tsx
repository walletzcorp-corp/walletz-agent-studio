'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, User, Settings } from 'lucide-react';
import Link from 'next/link';

interface UserMenuProps {
  email?: string | null;
  name?: string | null;
}

export function UserMenu({ email, name }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent w-full"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
          {initials}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="truncate text-sm font-medium text-foreground">{name ?? email}</p>
          {name && <p className="truncate text-xs text-muted-foreground">{email}</p>}
        </div>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-border bg-card py-1 shadow-lg">
          <Link
            href="/configuracoes/perfil"
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4" /> Perfil
          </Link>
          <Link
            href="/configuracoes"
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4" /> Configurações
          </Link>
          <hr className="my-1 border-border" />
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            onClick={() => {
              setOpen(false);
              // dispatch logout event — handled by auth context
              window.dispatchEvent(new CustomEvent('walletz:logout'));
            }}
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
