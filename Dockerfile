FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./

# Install dependencies (use legacy-peer-deps for next-auth/@auth/core version conflicts)
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Build Next.js app
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./

# Install production dependencies only (use legacy-peer-deps for next-auth/@auth/core version conflicts)
RUN npm ci --legacy-peer-deps --omit=dev

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY prisma ./prisma

# Run migrations and start app
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]

EXPOSE 3000
