FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build
FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* && groupadd --system hf && useradd --system --gid hf hf
COPY --from=builder --chown=hf:hf /app/.next/standalone ./
COPY --from=builder --chown=hf:hf /app/.next/static ./.next/static
COPY --from=builder --chown=hf:hf /app/public ./public
# Prisma migration CLI and seed tooling are deliberately retained for local Compose startup.
COPY --from=builder --chown=hf:hf /app/node_modules ./node_modules
COPY --from=builder --chown=hf:hf /app/prisma ./prisma
COPY --from=builder --chown=hf:hf /app/src/lib/content.ts ./src/lib/content.ts
COPY --from=builder --chown=hf:hf /app/scripts ./scripts
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
USER hf
EXPOSE 3000
CMD ["node","scripts/start-container.mjs"]
