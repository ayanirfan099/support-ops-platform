FROM node:22-bookworm-slim AS node-base

ENV COREPACK_HOME=/corepack
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

FROM node-base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgresql://supportops:build-only@localhost:5432/supportops?schema=public \
    BETTER_AUTH_SECRET=build-only-placeholder-not-for-runtime-use-000000000000 \
    BETTER_AUTH_URL=http://localhost:3000 \
    INTELLIGENCE_SERVICE_TOKEN=build-only-placeholder-not-for-runtime-use-000000000000
RUN pnpm db:generate && pnpm build

FROM dependencies AS migration
COPY . .
ENV DATABASE_URL=postgresql://supportops:build-only@localhost:5432/supportops?schema=public
RUN pnpm db:generate
CMD ["pnpm", "--filter", "@supportops/database", "prisma:deploy"]

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /workspace
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
