'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ToasterProvider } from '@walletz/ui';
import { AuthProvider } from '../hooks/use-auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: (failureCount, error) => {
              if ((error as { status?: number })?.status === 401) return false;
              return failureCount < 3;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToasterProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToasterProvider>
    </QueryClientProvider>
  );
}
