'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

function readDevToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const cookie = document.cookie.match(/(?:^|;\s*)walletz_dev_token=([^;]+)/);
  if (cookie) return cookie[1];
  try {
    return sessionStorage.getItem('walletz_dev_token') ?? undefined;
  } catch {
    return undefined;
  }
}

export function useToken(): string | undefined {
  const { data: session } = useSession();
  const [devToken, setDevToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    const t = readDevToken();
    if (t) setDevToken(t);
  }, []);

  return (session as any)?.accessToken ?? devToken;
}
