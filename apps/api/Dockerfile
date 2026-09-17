# Build context é a raiz do monorepo (docker-compose usa `context: .`), porque
# a API depende do workspace @tocafy/types.
FROM node:20-slim AS base
WORKDIR /app
# openssl: Prisma. python3/python-is-python3: yt-dlp-exec checa o binário
# "python" no preinstall (mesmo baixando um yt-dlp standalone depois).
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl python3 python-is-python3 && rm -rf /var/lib/apt/lists/*
RUN corepack enable

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types ./packages/types
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile
RUN pnpm --filter tocafy-api run prisma:generate && pnpm --filter tocafy-api build
RUN pnpm --filter tocafy-api deploy --prod /out

FROM base AS runtime
ENV NODE_ENV=production
RUN groupadd -r tocafy && useradd -r -g tocafy tocafy
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/dist ./dist
COPY --from=build /out/prisma ./prisma
COPY --from=build /out/package.json ./package.json
# Credencial do Firebase Admin (login com Google) — precisa existir em
# apps/api/firebase-service-account.json antes do build (nunca versionada).
COPY --from=build /app/apps/api/firebase-service-account.json ./firebase-service-account.json
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    mkdir -p /app/covers && chown -R tocafy:tocafy /app
USER tocafy
EXPOSE 3001
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
