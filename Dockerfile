FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./

# Install dependencies (use legacy-peer-deps for next-auth/@auth/core version conflicts)
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Generate Prisma client types (required for TypeScript build)
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# Production stage
FROM node:20-alpine

# OpenSSL required by Prisma binary
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./

# Install production dependencies only (use legacy-peer-deps for next-auth/@auth/core version conflicts)
RUN npm ci --legacy-peer-deps --omit=dev

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY prisma ./prisma

# Copy prisma CLI from builder so production stage has the correct version
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Create prisma bin symlink (not preserved across COPY --from)
RUN ln -sf /app/node_modules/prisma/build/index.js /app/node_modules/.bin/prisma && \
    chmod +x /app/node_modules/.bin/prisma

# Sync schema and start app
CMD ["sh", "-c", "node /app/node_modules/prisma/build/index.js db push --skip-generate && npm start"]

EXPOSE 3000
