'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { Laptop, MapPin, Smartphone } from 'lucide-react';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';
import SkeletonRows from '@/components/SkeletonRows';
import type { AccessLogPoint } from '@/components/AccessLogMap';

const AccessLogMap = dynamic(() => import('@/components/AccessLogMap'), { ssr: false });

type AccessLogEntry = {
  id: string;
  success: boolean;
  type: 'login' | 'resume';
  ip: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  engine: string | null;
  deviceVendor: string | null;
  deviceModel: string | null;
  cpuArch: string | null;
  createdAt: string;
};

export default function AccessLogPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['access-logs'],
    queryFn: () => api.get<AccessLogEntry[]>('/auth/access-logs'),
  });

  // Sinaliza IP nunca visto antes no histórico desse usuário — é o principal
  // indício de "alguém novo entrando", útil pra decidir se vale trocar a senha.
  const seenIps = new Set<string>();
  const chronological = [...(logs ?? [])].reverse();
  const newIpIds = new Set<string>();
  for (const log of chronological) {
    if (log.ip && seenIps.size > 0 && !seenIps.has(log.ip)) newIpIds.add(log.id);
    if (log.ip) seenIps.add(log.ip);
  }

  // O índice é a posição na lista abaixo (1-based) — assim o número do pino
  // no mapa bate com o número mostrado em cada linha do histórico.
  const indexed = (logs ?? []).map((l, i) => ({ ...l, index: i + 1, isNewIp: newIpIds.has(l.id) }));
  const points: AccessLogPoint[] = indexed
    .filter((l): l is typeof l & { latitude: number; longitude: number } => l.latitude != null && l.longitude != null)
    .map((l) => ({
      id: l.id,
      index: l.index,
      latitude: l.latitude,
      longitude: l.longitude,
      city: l.city,
      country: l.country,
      success: l.success,
      createdAt: l.createdAt,
    }));

  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold text-white">Log de acesso</h1>
      </div>

      {isLoading && <SkeletonRows rows={5} />}

      {!isLoading && points.length > 0 && (
        <div className="mb-6">
          <AccessLogMap points={points} />
        </div>
      )}

      {!isLoading && (logs ?? []).length === 0 && (
        <p className="text-muted">Nenhum acesso registrado ainda.</p>
      )}

      <div className="flex flex-col gap-2">
        {indexed.map((log) => (
          <div
            key={log.id}
            className={`flex flex-col gap-1 rounded bg-elevated p-4 text-sm ${
              log.success ? '' : 'border border-red-500/40'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span
                className={`flex min-w-0 flex-wrap items-center gap-2 font-semibold ${log.success ? 'text-white' : 'text-red-400'}`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                    log.success ? 'bg-accent' : 'bg-red-500'
                  } ${log.latitude == null || log.longitude == null ? 'opacity-40' : ''}`}
                  title={log.latitude == null ? 'Sem localização no mapa' : undefined}
                >
                  {log.index}
                </span>
                <span className="truncate">
                  {log.success
                    ? log.type === 'resume'
                      ? 'Retorno ao app'
                      : 'Login bem-sucedido'
                    : 'Tentativa falha'}
                </span>
                {log.isNewIp && (
                  <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                    IP novo
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xs text-muted">
                {new Date(log.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {[log.city, log.country].filter(Boolean).join(', ') || 'Local desconhecido'}
              </span>
              <span className="flex items-center gap-1">
                {log.deviceType === 'mobile' ? <Smartphone size={14} /> : <Laptop size={14} />}
                {[log.browser, log.os].filter(Boolean).join(' · ') || 'Dispositivo desconhecido'}
              </span>
              <span>{log.ip ?? 'IP desconhecido'}</span>
            </div>
            {(log.engine || log.deviceVendor || log.deviceModel || log.cpuArch || log.deviceType) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted/70">
                {log.deviceType && <span className="capitalize">{log.deviceType}</span>}
                {(log.deviceVendor || log.deviceModel) && (
                  <span>{[log.deviceVendor, log.deviceModel].filter(Boolean).join(' ')}</span>
                )}
                {log.engine && <span>Motor: {log.engine}</span>}
                {log.cpuArch && <span>CPU: {log.cpuArch}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
