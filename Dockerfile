FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Copy source and env
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build and expose
RUN npm run build
EXPOSE 3000

# Run Next.js
CMD ["npm", "start"]
    