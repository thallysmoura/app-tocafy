import { HardDrive } from 'lucide-react';

type StorageUsage = { bytes: number; objectCount: number; limitBytes: number; percentUsed: number };

const GB = 1024 ** 3;

export default function StorageUsageCard({ usage }: { usage: StorageUsage }) {
  const usedGb = usage.bytes / GB;
  const limitGb = usage.limitBytes / GB;
  const pct = usage.percentUsed;

  // Cor por faixa de uso: folga (verde), aviso perto do teto (amarelo),
  // ficar sem espaço de graça (vermelho). Detalhe de provedor de storage
  // (Cloudflare R2) é implementação interna — não aparece pro usuário.
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-accent';
  const textColor = pct >= 90 ? 'text-red-400' : pct >= 70 ? 'text-yellow-400' : 'text-accent';

  return (
    <div className="mb-6 max-w-md rounded bg-elevated p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <HardDrive size={16} />
          Armazenamento
        </div>
        <span className={`text-sm font-semibold ${textColor}`}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-elevatedhover">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>
          {usedGb.toFixed(2)} GB de {limitGb.toFixed(0)} GB usados · {usage.objectCount} música(s)
        </span>
        <span>plano gratuito</span>
      </div>
      {pct >= 90 && (
        <p className="mt-2 text-xs text-red-400">
          Quase no limite do plano gratuito — a partir daqui, GB extra passa a ser cobrado.
        </p>
      )}
    </div>
  );
}
