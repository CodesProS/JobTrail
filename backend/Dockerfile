# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy deps and source
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Non-root user for security
RUN addgroup -S jobtrail && adduser -S jobtrail -G jobtrail
USER jobtrail

EXPOSE 3000

CMD ["node", "server.js"]
