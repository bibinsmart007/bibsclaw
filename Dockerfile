# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production && cp -R node_modules /prod_modules
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 bibsclaw && adduser --system --uid 1001 bibsclaw
COPY --from=deps /prod_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY package.json ./
USER bibsclaw
EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3200/health || exit 1
CMD ["node", "dist/index.js"]
