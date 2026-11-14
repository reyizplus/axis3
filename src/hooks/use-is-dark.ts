'use client';

import { useSyncExternalStore } from 'react';

/**
 * `html.dark` sınıfını izler.
 *
 * `next-themes` sağlayıcısı yalnızca istemcide, ilk render'dan sonra bağlanır;
 * 3B sahneler ise tema hazır olmadan kurulduğu için `useTheme()` yerine doğrudan
 * belge sınıfı okunur. `useSyncExternalStore` sunucu anlık görüntüsüyle
 * (açık tema) hidrasyon uyuşmazlığı üretmez.
 */

function subscribe(callback: () => void): () => void {
  const root = document.documentElement;
  const observer = new MutationObserver(callback);
  observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains('dark');
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsDarkMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
