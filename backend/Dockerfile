# Stage 1: Build TypeScript backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to dist
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy compiled code from builder (includes server.js and seed.js)
COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/server.js"]
