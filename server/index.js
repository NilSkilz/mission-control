import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Try to load WebSocket manager (may not exist in dev)
let haWsManager = null;
try {
  const { getHAWebSocketManager } = await import('./websocket/haWebSocket.js');
  haWsManager = getHAWebSocketManager();
  
  // WebSocket server for frontend clients
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws, req) => {
    console.log(`🌐 WebSocket client connected from ${req.socket.remoteAddress}`);
    haWsManager.addClient(ws);
  });
  
  // WebSocket status endpoint
  app.get('/api/ws/status', (req, res) => {
    res.json(haWsManager.getStatus());
  });
} catch (e) {
  console.log('WebSocket manager not available:', e.message);
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'mission-control-api' });
});

// Import and register routes with error handling
async function setupRoutes() {
  try {
    const haModule = await import('./routes/homeAssistant.js');
    app.use('/api/ha', haModule.homeAssistantRoutes);
    console.log('✓ Home Assistant routes loaded');
  } catch (e) {
    console.error('✗ Failed to load homeAssistant routes:', e.message);
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
    const videosModule = await import('./routes/videos.js');
    app.use('/api/videos', videosModule.default);
    console.log('✓ Videos routes loaded');
  } catch (e) {
    console.error('✗ Failed to load videos routes:', e.message);
  }
}

// Start server
setupRoutes().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    if (haWsManager) {
      console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
    }
  });
});

export default app;
