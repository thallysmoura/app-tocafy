'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Quando uma nova versão do SW assume o controle (skipWaiting + clients.claim
    // no sw.js), recarrega a página uma vez automaticamente — sem isso, quem já
    // tinha o PWA instalado ficava preso em bundle/cache antigos até fechar e
    // reabrir o app manualmente.
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        registration.update().catch(() => undefined);
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              console.info('Tocafy: nova versão instalada, atualizando…');
            }
          });
        });
      })
      .catch((err) => console.warn('Falha ao registrar service worker', err));
  }, []);

  return null;
}
