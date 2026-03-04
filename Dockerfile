FROM node:22-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy application files
COPY server ./server
COPY dist ./dist
COPY db ./db
COPY amplify_outputs.json ./amplify_outputs.json

# Environment
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Startup script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]
