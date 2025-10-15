# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all files
COPY . .

# Note: Environment variables are not available during build in CapRover
# They are only available at runtime, which is why we initialize clients inside functions

# Build the app
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine
WORKDIR /app

# Only copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Debug: Log environment variables at runtime startup
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "=== RUNTIME ENVIRONMENT VARIABLES ==="' >> /app/start.sh && \
    echo 'echo "NODE_ENV: $NODE_ENV"' >> /app/start.sh && \
    echo 'echo "NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"' >> /app/start.sh && \
    echo 'echo "NEXT_PUBLIC_SUPABASE_ANON_KEY: $NEXT_PUBLIC_SUPABASE_ANON_KEY"' >> /app/start.sh && \
    echo 'echo "SUPABASE_SERVICE_ROLE_KEY: $SUPABASE_SERVICE_ROLE_KEY"' >> /app/start.sh && \
    echo 'echo "RESEND_API_KEY: $RESEND_API_KEY"' >> /app/start.sh && \
    echo 'echo "GEMINI_API_KEY: $GEMINI_API_KEY"' >> /app/start.sh && \
    echo 'echo "NEXT_PUBLIC_BASE_URL: $NEXT_PUBLIC_BASE_URL"' >> /app/start.sh && \
    echo 'echo "CAPROVER_APP_NAME: $CAPROVER_APP_NAME"' >> /app/start.sh && \
    echo 'echo "CAPROVER_APP_VERSION: $CAPROVER_APP_VERSION"' >> /app/start.sh && \
    echo 'echo "====================================="' >> /app/start.sh && \
    echo 'npm start' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose port
EXPOSE 3000

# Run the app with environment variable logging
CMD ["/app/start.sh"]
