'use client';

import { useDownload } from '@/context/DownloadContext';
import ImportSuccessModal from './ImportSuccessModal';

/** Renderizado uma vez, no topo do app — assim o modal de "faixa importada"
 * aparece independente de qual página o usuário está quando o download por
 * link do YouTube (ou upload de arquivo) termina. */
export default function GlobalDownloadModal() {
  const { successTrack, clearSuccess } = useDownload();
  if (!successTrack) return null;
  return <ImportSuccessModal trackTitle={successTrack.title} onClose={clearSuccess} />;
}
