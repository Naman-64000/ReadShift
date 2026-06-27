FROM node:20-alpine AS builder
WORKDIR /app

# Copy package configuration files and root lockfile
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY prisma/schema.prisma ./prisma/

# Install monorepo dependencies
RUN npm ci --ignore-scripts

# Copy server and prisma directories
COPY server/ ./server/
COPY prisma/ ./prisma/

# Generate Prisma Client
RUN npx prisma generate --schema=prisma/schema.prisma

# Build the server TypeScript code
WORKDIR /app/server
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy compiled files, server package.json, and the entire node_modules from builder
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001
WORKDIR /app/server
CMD ["node", "dist/index.js"]

