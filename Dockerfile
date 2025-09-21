# Multi-stage Dockerfile for Fusion Starter (Vite + Express + PNPM)

# ---- Builder: install deps and build ----
FROM node:20-alpine AS builder

# Enable pnpm via Corepack
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

# Copy source (simple and robust across this template)
COPY . .

# Install dependencies (prefer frozen lockfile if available)
# If a frozen install fails due to lockfile mismatches, fall back to a standard install
RUN pnpm install --frozen-lockfile || pnpm install

# Build production artifacts (client + server)
RUN pnpm build

# Remove dev dependencies for smaller runtime image
RUN pnpm prune --prod


# ---- Runner: copy only what is needed to run ----
FROM node:20-alpine AS runner
ENV NODE_ENV=production

# Enable pnpm to use start script
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

# Copy built app and pruned node_modules from builder
COPY --from=builder /app .

# App listens on 8080 in this starter
ENV PORT=8080
ENV HOST=0.0.0.0
EXPOSE 8080

# Run the production server
CMD ["pnpm", "start"]
