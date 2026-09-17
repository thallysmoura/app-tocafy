/**
 * One-off: sobe pro R2 as faixas que já existem no banco mas ainda não têm
 * r2Key. Versão JS (sem ts-node) pra rodar direto na imagem de produção,
 * que só tem as dependências de runtime instaladas.
 */
const { PrismaClient } = require('@prisma/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

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

  const tracks = await prisma.track.findMany({ where: { r2Key: null } });
  console.log(`${tracks.length} faixa(s) sem r2Key.`);

  let ok = 0;
  let skipped = 0;
  for (const track of tracks) {
    if (!fs.existsSync(track.filePath)) {
      console.warn(`Pulando (arquivo não encontrado): ${track.filePath}`);
      skipped++;
      continue;
    }
    const key = `tracks/${track.id}.mp3`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fs.createReadStream(track.filePath),
        ContentType: 'audio/mpeg',
      }),
    );
    await prisma.track.update({ where: { id: track.id }, data: { r2Key: key } });
    ok++;
    console.log(`OK: ${track.title}`);
  }

  console.log(`Concluído: ${ok} enviada(s), ${skipped} pulada(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
