FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Copy source (optional) and the pre-built Next.js output
COPY . .

# Copy pre-built Next.js output from local build
COPY .next ./.next
COPY public ./public
COPY next.config.js ./

# Set runtime env only
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
