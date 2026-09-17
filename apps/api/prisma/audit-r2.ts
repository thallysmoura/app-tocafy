/**
 * One-off: audita as faixas com r2Key preenchido no banco e confirma se o
 * objeto realmente existe no bucket R2. Faixas com r2Key órfã (upload/backfill
 * falhou, objeto apagado etc.) são a causa do "Falha ao carregar áudio (código
 * 4)" no player — o endpoint /tracks/:id/stream agora bloqueia esse caso com
 * 404, mas os dados ficam inconsistentes até rodar este script.
 *
 * Para cada órfã: re-sobe pro R2 se o arquivo local (filePath) ainda existir;
 * senão, limpa o r2Key pra faixa cair no fallback de arquivo local (ou virar
 * 404 claro, se também não houver arquivo local).
 */
import { PrismaClient } from '@prisma/client';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    console.error('Faltam variáveis R2_* no ambiente.');
    process.exit(1);
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const tracks = await prisma.track.findMany({ where: { r2Key: { not: null } } });
  console.log(`${tracks.length} faixa(s) com r2Key para auditar.`);

  let ok = 0;
  let reuploaded = 0;
  let cleared = 0;

  for (const track of tracks) {
    const key = track.r2Key as string;
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      ok++;
      continue;
    } catch {
      // objeto não encontrado (ou erro de acesso) — cai pro tratamento abaixo
    }

    if (fs.existsSync(track.filePath)) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: fs.createReadStream(track.filePath),
          ContentType: 'audio/mpeg',
        }),
      );
      console.log(`Re-upload OK: ${track.title} (${key})`);
      reuploaded++;
    } else {
      await prisma.track.update({ where: { id: track.id }, data: { r2Key: null } });
      console.warn(`Órfã sem arquivo local, r2Key limpo: ${track.title} (${key})`);
      cleared++;
    }
  }

  console.log(`Concluído: ${ok} ok, ${reuploaded} re-enviada(s), ${cleared} limpa(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
