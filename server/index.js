import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getHAWebSocketManager } from './websocket/haWebSocket.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// WebSocket server for frontend clients
const wss = new WebSocketServer({ server, path: '/ws' });
const haWsManager = getHAWebSocketManager();

wss.on('connection', (ws, req) => {
  console.log(`🌐 WebSocket client connected from ${req.socket.remoteAddress}`);
  haWsManager.addClient(ws);
});

// WebSocket status endpoint
app.get('/api/ws/status', (req, res) => {
  res.json(haWsManager.getStatus());
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'mission-control-api' });
});

// Import and register routes with error handling
async function setupRoutes() {
  // Auth first: /api/auth is public (login), then everything else under /api
  // requires a valid bearer token.
  try {
    const authModule = await import('./routes/auth.js');
    const { authGuard } = await import('./lib/auth.js');
    app.use('/api/auth', authModule.default);
    app.use('/api', authGuard);
    console.log('✓ Auth routes loaded + API guarded');
  } catch (e) {
    console.error('✗ Failed to load auth/guard:', e.message);
  }

  try {
    const haModule = await import('./routes/homeAssistant.js');
    app.use('/api/ha', haModule.homeAssistantRoutes);
    console.log('✓ Home Assistant routes loaded');
  } catch (e) {
    console.error('✗ Failed to load homeAssistant routes:', e.message);
  }

  try {
    const familyModule = await import('./routes/family.js');
    app.use('/api/family', familyModule.default);
    console.log('✓ Family data routes loaded');
  } catch (e) {
    console.error('✗ Failed to load family routes:', e.message);
  }

  try {
    const servicesModule = await import('./routes/services.js');
    app.use('/api/services', servicesModule.default);
    console.log('✓ Services routes loaded');
  } catch (e) {
    console.error('✗ Failed to load services routes:', e.message);
  }

  try {
    const calModule = await import('./routes/calendar.js');
    app.use('/api/calendar', calModule.default);
    console.log('✓ Calendar routes loaded');
  } catch (e) {
    console.error('✗ Failed to load calendar routes:', e.message);
  }

  try {
    const todoModule = await import('./routes/todo.js');
    app.use('/api/todo', todoModule.default);
    console.log('✓ Todo routes loaded');
  } catch (e) {
    console.error('✗ Failed to load todo routes:', e.message);
  }

  try {
    const docsModule = await import('./routes/documents.js');
    app.use('/api/documents', docsModule.default);
    console.log('✓ Documents routes loaded');
  } catch (e) {
    console.error('✗ Failed to load documents routes:', e.message);
  }

  try {
    const presenceModule = await import('./routes/presence.js');
    app.use('/api/presence', presenceModule.default);
    console.log('✓ Presence routes loaded');
  } catch (e) {
    console.error('✗ Failed to load presence routes:', e.message);
  }

  try {
    const agentsModule = await import('./routes/agents.js');
    app.use('/api/agents', agentsModule.default);
    console.log('✓ Agents routes loaded');
  } catch (e) {
    console.error('✗ Failed to load agents routes:', e.message);
  }

  try {
    const openclawModule = await import('./routes/openclaw.js');
    app.use('/api/openclaw', openclawModule.default);
    console.log('✓ OpenClaw routes loaded');
  } catch (e) {
    console.error('✗ Failed to load openclaw routes:', e.message);
  }

  try {
    const mediaModule = await import('./routes/media.js');
    app.use('/api/media', mediaModule.default);
    console.log('✓ Media routes loaded');
  } catch (e) {
    console.error('✗ Failed to load media routes:', e.message);
  }

  try {
    const systemModule = await import('./routes/system.js');
    app.use('/api/system', systemModule.systemRoutes);
    app.use('/api/notifications', systemModule.systemRoutes);
    console.log('✓ System routes loaded');
  } catch (e) {
    console.error('✗ Failed to load system routes:', e.message);
  }

  try {
    const networkModule = await import('./routes/network.js');
    app.use('/api/network', networkModule.networkRoutes);
    console.log('✓ Network routes loaded');
  } catch (e) {
    console.error('✗ Failed to load network routes:', e.message);
  }

  try {
    const eventsModule = await import('./routes/events.js');
    app.use('/api/events', eventsModule.default);
    console.log('✓ Events routes loaded');
  } catch (e) {
    console.error('✗ Failed to load events routes:', e.message);
  }

  try {
    const videosModule = await import('./routes/videos.js');
    app.use('/api/videos', videosModule.default);
    console.log('✓ Videos routes loaded');
  } catch (e) {
    console.error('✗ Failed to load videos routes:', e.message);
  }
}

// Serve the built frontend (dist/) when present, so production runs on one port
function setupStaticFrontend() {
  const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
  if (!fs.existsSync(distDir)) return;
  app.use(express.static(distDir, {
    setHeaders: (res, filePath) => {
      // Content-hashed build assets never change under their name → cache forever.
      // Everything else (index.html, manifest, sw.js, icons) must revalidate so
      // installed PWAs pick up new deploys instead of serving a stale shell.
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health' || req.path === '/ws') return next();
    // The app shell must never be cached, or PWAs get stuck on an old build.
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(distDir, 'index.html'));
  });
  console.log('✓ Serving frontend from dist/');
}

// Start server
setupRoutes().then(() => {
  setupStaticFrontend();
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
  });
});

export default app;
