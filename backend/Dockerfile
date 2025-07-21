# backend/Dockerfile
# Version: 1.0.0
# Initial Dockerfile configuration for Node.js/TypeScript/Prisma backend

# ==================================
# Stage 1: Dependencies
# Install dependencies in separate stage for better caching
# ==================================
FROM node:20-alpine AS dependencies

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build stage)
RUN npm ci --verbose

# ==================================
# Stage 2: Build
# Build TypeScript application and generate Prisma client
# ==================================
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code and configuration files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript application
RUN npm run build

# ==================================
# Stage 3: Production Dependencies
# Install only production dependencies for final image
# ==================================
FROM node:20-alpine AS production-dependencies

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production --verbose && npm cache clean --force

# ==================================
# Stage 4: Runtime
# Final production image with minimal footprint
# ==================================
FROM node:20-alpine AS runtime

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001

# Set working directory
WORKDIR /app

# Install production dependencies
COPY --from=production-dependencies /app/node_modules ./node_modules

# Copy built application
COPY --from=build /app/dist ./dist

# Copy Prisma schema and generated client
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Copy package.json for npm scripts
COPY package.json ./

# Create uploads directory for file storage
RUN mkdir -p uploads && chown -R backend:nodejs uploads

# Change ownership of application files to non-root user
RUN chown -R backend:nodejs /app

# Switch to non-root user
USER backend

# Expose application port
EXPOSE 3001

# Health check to verify application is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { \
    process.exit(res.statusCode === 200 ? 0 : 1) \
  }).on('error', () => process.exit(1))"

# Start application
CMD ["npm", "start"]

# backend/Dockerfile
# Version: 1.0.0
# Initial Dockerfile configuration for Node.js/TypeScript/Prisma backend