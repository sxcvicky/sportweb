FROM node:22-bookworm-slim AS deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci

FROM deps AS build
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app/server
ENV NODE_ENV=production
ENV TZ=Asia/Shanghai
RUN apt-get update \
  && apt-get install -y --no-install-recommends tzdata \
  && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/server/dist ./dist
COPY server/prompts ./prompts
COPY server/kb ./kb
COPY server/migrations ./migrations
COPY server/scripts ./scripts
COPY web /app/web
RUN mkdir -p /app/server/data /app/server/backups
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
