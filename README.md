# Tocafy

Spotify caseiro: sua biblioteca de música pessoal (upload manual, importação de link do
YouTube, ou apontando pra uma pasta local), com autenticação, playlists, curtidas, player
persistente entre abas e histórico. Áudio hospedado no **Cloudflare R2**, exposto publicamente
via **Cloudflare Tunnel** — sem precisar abrir porta no roteador.

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | pnpm workspaces (`apps/*`, `packages/*`) |
| Backend (`apps/api`) | NestJS 10 + Prisma 5 + PostgreSQL, Redis (ioredis), JWT (passport-jwt), `@aws-sdk/client-s3` (Cloudflare R2), `music-metadata`/`chokidar`, `yt-dlp-exec` + `ffmpeg-static` (import via link do YouTube), web-push |
| Frontend (`apps/web`) | Next.js 14 (App Router) + React 18, TanStack Query, Tailwind, PWA |
| Storage de áudio | Cloudflare R2 (API S3-compatible) — URLs assinadas (presigned), expiração de 1h |
| Infra | Docker (Postgres + Redis + `cloudflared`), API e Web rodando direto no host |

## Arquitetura

```
Cliente (browser/PWA)
   │  https://tocafy.mouora.com
   ▼
Cloudflare Tunnel (cloudflared, em Docker)
   ├── tocafy.mouora.com      → host.docker.internal:3002  (apps/web, Next.js)
   └── tocafy-api.mouora.com  → host.docker.internal:3001  (apps/api, NestJS)
                                        │
                                        ├── PostgreSQL (Docker, porta 5432)
                                        ├── Redis (Docker, porta 6379)
                                        └── Cloudflare R2 (arquivos .mp3)
```

`api` e `web` **não rodam em container** — só `postgres`, `redis` e `cloudflared` ficam no
Docker. Isso deixa build/deploy/hot-reload mais simples (sem rebuild de imagem a cada mudança)
e ainda expõe tudo publicamente através do túnel, que aponta para o host via
`host.docker.internal`.

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
| `DATABASE_URL` | Postgres. Ao rodar `api`/`web` no host (fora do Docker), use `localhost:5432` |
| `REDIS_URL` | Idem, `localhost:6379` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Segredos de assinatura do JWT — gere valores aleatórios próprios |
| `CORS_ORIGINS` | Origens permitidas pela API, separadas por vírgula |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Credenciais do bucket Cloudflare R2 (token com permissão *Object Read & Write*, escopo restrito ao bucket) |
| `NEXT_PUBLIC_API_URL` | URL pública da API que o front consome |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push — gere com `npx web-push generate-vapid-keys` |
| `MUSIC_DIR` | Pasta local opcional com MP3s pra importar automaticamente |

### 3. Subir Postgres + Redis + Cloudflare Tunnel

```bash
docker compose up -d
docker compose ps   # deve mostrar postgres, redis e cloudflared "healthy"/"up"
```

### 4. Rodar a API e o Web (direto no host, sem Docker)

```bash
pnpm install

# API
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate:dev   # primeira vez / após mudar o schema
pnpm build
pnpm start                # produção, porta 3001 — ou `pnpm start:dev` pra hot-reload

# Web (outro terminal)
cd apps/web
pnpm build
pnpm start                # produção, porta 3002 — ou `pnpm dev` pra hot-reload
```

Sem Cloudflare Tunnel, a aplicação já funciona localmente em `http://localhost:3002`
(API em `http://localhost:3001`).

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
       service: http://host.docker.internal:3002
     - hostname: api.seu-dominio.com
       service: http://host.docker.internal:3001
     - service: http_status:404
   ```
4. Ajuste em `docker-compose.yml` o nome do arquivo `.json` de credenciais montado no serviço
   `cloudflared` para bater com o `<TUNNEL_ID>` gerado no passo 1.
5. `docker compose up -d cloudflared` (ou `docker compose up -d` geral) sobe o túnel.

`host.docker.internal` é resolvido automaticamente pelo Docker Desktop; em Linux puro, o
`extra_hosts: ['host.docker.internal:host-gateway']` já presente no `docker-compose.yml`
cobre isso (Docker 20.10+).

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
