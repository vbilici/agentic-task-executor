# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable pnpm

# Copy package files
COPY package.json ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build-time argument for API URL (baked into static files)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN pnpm build

# Stage 2: Serve with nginx
FROM nginx:alpine AS runtime

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run uses port 8080 by default
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
