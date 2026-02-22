FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Copy static public files to dist (TypeScript doesn't copy non-TS files)
RUN cp -r src/web/public dist/web/public

FROM node:22-slim

WORKDIR /app

# Install git for agent git operations
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3200

CMD ["node", "dist/index.js"]
