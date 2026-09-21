/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necessário pro Dockerfile (roda `node apps/web/server.js` a partir do
  // build standalone). Se um dia voltar a rodar via `next start` direto no
  // host, tirar isso — os dois modos não são compatíveis entre si.
  output: 'standalone',

  // O app nunca usa <Image> do Next (só <img> normal) — desliga a API de
  // otimização de imagem embutida (/_next/image). Ela vem ligada por padrão
  // mesmo sem uso, e a versão atual do Next tem um RCE crítico conhecido
  // nesse endpoint (processamento de AVIF); sem uso real, desligar é mais
  // seguro e mais rápido que um upgrade major arriscado do Next agora.
  images: { unoptimized: true },

  // Não anuncia "Next.js" no header X-Powered-By pra quem for escanear o
  // site — a API já esconde isso por padrão via helmet.
  poweredByHeader: false,

  // Headers de segurança básicos — o app não tinha nenhum antes (só a API
  // usava helmet). Sem CSP explícita de propósito: o app usa vários domínios
  // externos (Firebase, R2, YouTube, OpenStreetMap) e uma CSP mal calibrada
  // quebra silenciosamente em produção sem eu conseguir testar tudo aqui.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Impede que o site seja carregado num <iframe> de outro domínio
          // (clickjacking) — não tem nenhum caso de uso pra embutir o app.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Navegador não tenta "adivinhar" o tipo de um arquivo servido com
          // Content-Type errado — mitiga alguns ataques de MIME sniffing.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restringe microfone/geolocalização (usados de verdade — identificar
          // música e log de acesso) a este próprio site; bloqueia o resto.
          { key: 'Permissions-Policy', value: 'microphone=(self), geolocation=(self), camera=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
