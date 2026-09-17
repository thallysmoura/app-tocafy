# Build context é a raiz do monorepo (docker-compose usa `context: .`), porque
# o web depende do workspace @tocafy/types.
FROM node:20-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types ./packages/types
COPY apps/web ./apps/web
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm install --frozen-lockfile
RUN pnpm --filter tocafy-web build

FROM base AS runtime
ENV NODE_ENV=production
RUN groupadd -r tocafy && useradd -r -g tocafy tocafy
COPY --from=build /app/apps/web/public ./public
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
RUN chown -R tocafy:tocafy /app
USER tocafy
EXPOSE 3002
ENV PORT=3002
CMD ["node", "apps/web/server.js"]
