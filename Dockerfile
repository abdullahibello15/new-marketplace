# syntax=docker/dockerfile:1
# One image for the API and the worker (BACKEND_PLAN §1). Build from the repo root:
#   docker build -t zamani-api .
# It runs the API by default. The worker is the same image with another command:
#   node --enable-source-maps apps/api/dist/worker.js
ARG NODE_VERSION=22.23.4

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
ENV npm_config_update_notifier=false npm_config_fund=false npm_config_audit=false

# Only the manifests, so the dependency layers stay cached until a package.json or the lockfile changes.
# apps/web's and packages/domain's manifests are needed because the lockfile lists them as workspaces; none
# of their code is copied (the API doesn't use the domain package yet).
FROM base AS manifests
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
COPY packages/domain/package.json packages/domain/

FROM manifests AS build
RUN --mount=type=cache,target=/root/.npm npm ci --workspace apps/api --include-workspace-root=false
COPY apps/api apps/api
COPY packages/contracts packages/contracts
RUN npm run build --workspace apps/api

# Production dependencies only. Workspace links are dropped: @zamani/* is bundled into dist.
FROM manifests AS prod-deps
RUN --mount=type=cache,target=/root/.npm npm ci --workspace apps/api --include-workspace-root=false --omit=dev \
 && rm -rf node_modules/@zamani \
 && mkdir -p apps/api/node_modules

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production \
    TZ=Africa/Lagos
WORKDIR /app
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=prod-deps /app/apps/api/node_modules apps/api/node_modules
# package.json carries "type": "module" for dist/*.js.
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
# The official image's unprivileged user (uid 1000). The files above stay root-owned and read-only to it.
USER node
EXPOSE 3000
CMD ["node", "--enable-source-maps", "apps/api/dist/server.js"]
