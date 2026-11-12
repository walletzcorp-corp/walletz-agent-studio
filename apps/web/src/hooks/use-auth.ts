'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, tenantsApi, type LoginResponse } from '../lib/api';

interface AuthState {
  userId: string | null;
  email: string | null;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  role: string | null;
  /** Só orienta a UI; o acesso a /admin é validado no servidor. */
  isPlatformAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const INITIAL_STATE: AuthState = {
  userId: null,
  email: null,
  tenantId: null,
  tenantSlug: null,
  tenantName: null,
  role: null,
  isPlatformAdmin: false,
  isAuthenticated: false,
  isLoading: true,
};

export function useAuth() {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);
  const router = useRouter();

  const storeTokens = useCallback((res: LoginResponse, sessionId?: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    if (sessionId) localStorage.setItem('sessionId', sessionId);
  }, []);

  const clearTokens = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('tenantSlug');
  }, []);

  const loadUser = useCallback(async () => {
    if (typeof window === 'undefined') {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setState({ ...INITIAL_STATE, isLoading: false });
      return;
    }

    try {
      const { data: user } = await authApi.me();
      const { data: tenants } = await tenantsApi.myTenants();
      const activeTenant = tenants[0];

      setState({
        userId: user.userId,
        email: user.email,
        tenantId: activeTenant?.tenantId ?? null,
        tenantSlug: activeTenant?.tenantSlug ?? null,
        tenantName: activeTenant?.tenantName ?? null,
        role: activeTenant?.role ?? null,
        isPlatformAdmin: user.isPlatformAdmin === true,
        isAuthenticated: true,
        isLoading: false,
      });

      if (activeTenant) {
        localStorage.setItem('tenantSlug', activeTenant.tenantSlug);
      } else {
        localStorage.removeItem('tenantSlug');
      }
      return { isPlatformAdmin: user.isPlatformAdmin === true, hasTenant: !!activeTenant };
    } catch {
      clearTokens();
      setState({ ...INITIAL_STATE, isLoading: false });
      return { isPlatformAdmin: false, hasTenant: false };
    }
  }, [clearTokens]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email: string, password: string, mfaCode?: string) => {
    const { data } = await authApi.login({ email, password, mfaCode });
    if (data.requiresMfa) {
      return { requiresMfa: true, mfaToken: data.mfaToken };
    }
    storeTokens(data);
    const loaded = await loadUser();
    // Admin da plataforma sem organização própria vai direto ao painel admin.
    router.push(loaded?.isPlatformAdmin && !loaded.hasTenant ? '/admin' : '/');
    return { requiresMfa: false };
  }, [storeTokens, loadUser, router]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearTokens();
    setState({ ...INITIAL_STATE, isLoading: false });
    router.push('/auth/login');
  }, [clearTokens, router]);

  return { ...state, login, logout, reload: loadUser };
}
