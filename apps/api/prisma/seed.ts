import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const demoEmail = process.env.DEMO_USER_EMAIL;
  const demoPassword = process.env.DEMO_USER_PASSWORD;

  if (!demoEmail) {
    throw new Error('DEMO_USER_EMAIL não definida — seed abortado.');
  }
  if (!demoPassword) {
    throw new Error(
      'DEMO_USER_PASSWORD não definida. Defina a variável de ambiente antes de rodar o seed; a senha nunca é lida de outro lugar.',
    );
  }

  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail.toLowerCase() },
    create: {
      email: demoEmail.toLowerCase(),
      passwordHash,
      displayName: 'Thallys',
      mustChangePassword: true,
    },
    update: {},
  });

  await prisma.notificationPreference.upsert({
    where: { userId: demoUser.id },
    create: { userId: demoUser.id },
    update: {},
  });

  // Segundo usuário de demonstração, sem acesso a nada sensível.
  const secondaryHash = await bcrypt.hash('demo-guest-only-123', 12);
  await prisma.user.upsert({
    where: { email: 'convidado@tocafy.local' },
    create: {
      email: 'convidado@tocafy.local',
      passwordHash: secondaryHash,
      displayName: 'Convidado',
      mustChangePassword: true,
    },
    update: {},
  });

  // A biblioteca real vem do scan de MUSIC_DIR — o seed não cria faixas/álbuns
  // fictícios, só a conta de acesso, para não misturar dados de teste com sua
  // música de verdade.

  console.log('Seed concluído.');
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
