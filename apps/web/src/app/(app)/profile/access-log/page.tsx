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
  ip: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  createdAt: string;
};

export default function AccessLogPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['access-logs'],
    queryFn: () => api.get<AccessLogEntry[]>('/auth/access-logs'),
  });

  const points: AccessLogPoint[] = (logs ?? [])
    .filter((l): l is AccessLogEntry & { latitude: number; longitude: number } => l.latitude != null && l.longitude != null)
    .map((l) => ({
      id: l.id,
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
        {(logs ?? []).map((log) => (
          <div
            key={log.id}
            className={`flex flex-col gap-1 rounded bg-elevated p-4 text-sm ${
              log.success ? '' : 'border border-red-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${log.success ? 'text-white' : 'text-red-400'}`}>
                {log.success ? 'Login bem-sucedido' : 'Tentativa falha'}
              </span>
              <span className="text-xs text-muted">
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
          </div>
        ))}
      </div>
    </div>
  );
}
