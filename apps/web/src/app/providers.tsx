'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { PlayerProvider } from '@/context/PlayerContext';
import { DownloadProvider } from '@/context/DownloadContext';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Sem isso, toda troca de página remontava o componente e refazia
            // o fetch do zero (staleTime padrão é 0) — dado ficava "fresco"
            // por 30s, então navegar de volta a uma página mostra os dados
            // na hora (do cache) e só revalida em segundo plano.
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PlayerProvider>
          <DownloadProvider>{children}</DownloadProvider>
        </PlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
