# Mission Control - Simple production image
# For development rebuilds, run `npm run build` on host first

FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev --legacy-peer-deps

# Copy server code
COPY server ./server

# Copy pre-built frontend
COPY dist ./dist

# Copy other needed files
COPY db ./db
COPY amplify_outputs.json ./amplify_outputs.json

# Environment variables
ENV PORT=3001
ENV NODE_ENV=production

# Expose ports
EXPOSE 3001 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]
