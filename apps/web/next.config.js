/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necessário pro Dockerfile (roda `node apps/web/server.js` a partir do
  // build standalone). Se um dia voltar a rodar via `next start` direto no
  // host, tirar isso — os dois modos não são compatíveis entre si.
  output: 'standalone',
};

module.exports = nextConfig;
