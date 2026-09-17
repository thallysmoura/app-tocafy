# Tocafy

Spotify caseiro: sua biblioteca de música pessoal (upload manual, importação de link do
YouTube, ou apontando pra uma pasta local), com autenticação, playlists, curtidas, player
persistente entre abas e histórico. Áudio hospedado no **Cloudflare R2**, exposto publicamente
via **Cloudflare Tunnel** — sem precisar abrir porta no roteador.

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | pnpm workspaces (`apps/*`, `packages/*`) |
| Backend (`apps/api`) | NestJS 10 + Prisma 5 + PostgreSQL, JWT (passport-jwt), `@aws-sdk/client-s3` (Cloudflare R2), `music-metadata`/`chokidar`, `yt-dlp-exec` + `ffmpeg-static` (import via link do YouTube), web-push |
| Frontend (`apps/web`) | Next.js 14 (App Router) + React 18, TanStack Query, Tailwind, PWA |
| Storage de áudio | Cloudflare R2 (API S3-compatible) — URLs assinadas (presigned), expiração de 1h |
| Infra | Tudo em Docker via `docker compose`: Postgres, `cloudflared`, `api` e `web` |

## Arquitetura

```
Cliente (browser/PWA)
   │  https://tocafy.mouora.com
   ▼
Cloudflare Tunnel (cloudflared, em Docker)
   ├── tocafy.mouora.com      → web:3002   (apps/web, Next.js)
   └── tocafy-api.mouora.com  → api:3001   (apps/api, NestJS)
                                        │
                                        ├── PostgreSQL (Docker, porta 5432)
                                        └── Cloudflare R2 (arquivos .mp3)
```

Todos os serviços rodam em containers na mesma rede do `docker-compose.yml` — `api`/`web` se
comunicam com `postgres` pelo nome do serviço (não `localhost`), e o `cloudflared` aponta pro
nome dos serviços `web`/`api` também.

## Rodando o projeto

### 1. Pré-requisitos

- Node 20+, [pnpm](https://pnpm.io/) (via `corepack enable`)
- Docker + Docker Desktop (ou Docker Engine)
- Uma conta Cloudflare com um domínio configurado (pra R2 e pro Tunnel)

### 2. Variáveis de ambiente

Copie os exemplos e preencha com valores reais (nunca comite os `.env` reais — já estão no
`.gitignore`):

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env   # se existir; senão copie o .env.example da raiz
```

Principais variáveis:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Postgres. Com tudo em Docker, use o nome do serviço: `postgres:5432` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Segredos de assinatura do JWT — gere valores aleatórios próprios |
| `CORS_ORIGINS` | Origens permitidas pela API, separadas por vírgula |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Credenciais do bucket Cloudflare R2 (token com permissão *Object Read & Write*, escopo restrito ao bucket) |
| `NEXT_PUBLIC_API_URL` | URL pública da API que o front consome |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push — gere com `npx web-push generate-vapid-keys` |
| `MUSIC_DIR` | Pasta local opcional com MP3s pra importar automaticamente |
| `NEXT_PUBLIC_FIREBASE_*` (6 vars) | Config pública do app Firebase — login com Google. Pega no console do Firebase (Configurações do projeto → Geral → seus apps) |

**Login com Google:** além das `NEXT_PUBLIC_FIREBASE_*` (usadas no build do `web`, injetadas via
`build.args` no `docker-compose.yml`), o backend precisa da credencial do **Firebase Admin**:
baixe o JSON em Firebase Console → Configurações do projeto → Contas de serviço → "Gerar nova
chave privada", salve como `apps/api/firebase-service-account.json` (gitignored, nunca
versionar) **antes** de rodar `docker compose build api` — o Dockerfile copia esse arquivo pra
dentro da imagem.

### 3. Subir tudo

```bash
docker compose build api web   # primeira vez / após mudar código de api ou web
docker compose up -d
docker compose ps   # postgres, cloudflared, api, web
```

Rodando localmente sem o Cloudflare Tunnel: `http://localhost:3002` (web) e
`http://localhost:3001` (api).

Pra desenvolvimento com hot-reload, dá pra rodar `api`/`web` fora do Docker (usando
`localhost` no `DATABASE_URL`/`REDIS_URL` e `pnpm --filter tocafy-api start:dev` /
`pnpm --filter tocafy-web dev`), mas o `docker-compose.yml` deste repo já assume produção
com tudo containerizado.

## Cloudflare Tunnel (expor publicamente)

1. `cloudflared tunnel login` e `cloudflared tunnel create tocafy` (ou nome de sua escolha) —
   isso gera um `<TUNNEL_ID>.json` e um `cert.pem`. Coloque ambos em `.cloudflared/`
   (a pasta inteira é ignorada pelo git — são credenciais, nunca versionar).
2. Crie os registros DNS apontando pro túnel:
   ```bash
   cloudflared tunnel route dns tocafy seu-dominio.com
   cloudflared tunnel route dns tocafy api.seu-dominio.com
   ```
3. Crie `.cloudflared/tunnel-config.docker.yml`:
   ```yaml
   tunnel: <TUNNEL_ID>
   credentials-file: /etc/cloudflared/creds.json

   ingress:
     - hostname: seu-dominio.com
       service: http://web:3002
     - hostname: api.seu-dominio.com
       service: http://api:3001
     - service: http_status:404
   ```
4. Ajuste em `docker-compose.yml` o nome do arquivo `.json` de credenciais montado no serviço
   `cloudflared` para bater com o `<TUNNEL_ID>` gerado no passo 1.
5. `docker compose up -d` sobe tudo, incluindo o túnel.

## Estrutura

```
apps/
  api/     — NestJS + Prisma. Auth (JWT), tracks, playlists, likes, upload (arquivo/YouTube),
             streaming (local ou R2 via URL presigned), push, integração Audius.
  web/     — Next.js (App Router). Sidebar, player persistente (Context + <audio>),
             busca, biblioteca, playlists, upload de música (arquivo .mp3 ou link do YouTube).
packages/
  types/   — Tipos TypeScript compartilhados entre api e web.
```

## Principais rotas da API

- `POST /auth/login`, `/auth/refresh`, `/auth/logout` — autenticação por JWT (cookies HttpOnly)
- `GET /tracks`, `GET /tracks/search` — listagem e busca
- `POST /tracks/upload` — upload de `.mp3` (vai pro R2)
- `POST /tracks/youtube` → `GET /tracks/youtube/:jobId` — importa áudio de um link do YouTube
  (job assíncrono com progresso, via `yt-dlp`)
- `GET /tracks/:id/stream` — stream do áudio (Range, redireciona pra URL assinada do R2 quando
  a faixa está lá)
- `GET /playlists`, `POST /playlists`, `POST /playlists/:id/tracks/:trackId` — playlists
- `GET /me/likes`, `POST /me/likes/:trackId` — músicas curtidas
