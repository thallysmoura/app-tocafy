# Build context é a raiz do monorepo (docker-compose usa `context: .`), porque
# o web depende do workspace @tocafy/types.
FROM node:20-slim AS base
WORKDIR /app
RUN corepack enable
# pnpm install na raiz do monorepo instala as deps de todos os workspaces,
# incluindo o preinstall do yt-dlp-exec (usado pela API) que checa "python".
RUN apt-get update -y && apt-get install -y --no-install-recommends python3 python-is-python3 && rm -rf /var/lib/apt/lists/*

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types ./packages/types
COPY apps/web ./apps/web
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
ENV NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}
ENV NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}
RUN pnpm install --frozen-lockfile
RUN pnpm --filter tocafy-web build

FROM base AS runtime
ENV NODE_ENV=production
RUN groupadd -r tocafy && useradd -r -g tocafy tocafy
COPY --from=build /app/apps/web/.next/standalone ./
# Standalone não empacota a pasta public/estáticos sozinho — tem que copiar
# manualmente, e no lugar certo: ao lado de apps/web/server.js (mesma
# estrutura de pastas do monorepo), não em /app/public (aí vira 404 em tudo:
# manifest.json, sw.js, ícones, fontes).
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
RUN chown -R tocafy:tocafy /app
USER tocafy
EXPOSE 3002
ENV PORT=3002
CMD ["node", "apps/web/server.js"]
