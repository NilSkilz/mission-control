import WebSocket from 'ws';

/**
 * Home Assistant WebSocket Connection Manager
 * Connects to HA, subscribes to state changes, and broadcasts to clients
 */
class HAWebSocketManager {
  constructor() {
    this.haWs = null;
    this.clients = new Set();
    this.messageId = 1;
    this.authenticated = false;
    this.subscribed = false;
    this.reconnectTimer = null;
    this.eventBuffer = []; // Store recent events for new clients
    this.maxBufferSize = 50;
    
    this.haUrl = (process.env.HA_URL || 'http://localhost:8123').replace('http', 'ws') + '/api/websocket';
    this.haToken = process.env.HA_TOKEN;
    
    if (!this.haToken) {
      console.error('❌ HA_TOKEN not set - WebSocket will not connect');
      return;
    }
    
    this.connect();
  }
  
  connect() {
    if (this.haWs && this.haWs.readyState === WebSocket.OPEN) {
      return;
    }
    
    console.log(`🔌 Connecting to Home Assistant WebSocket: ${this.haUrl}`);
    
    try {
      this.haWs = new WebSocket(this.haUrl);
      
      this.haWs.on('open', () => {
        console.log('✅ Connected to Home Assistant WebSocket');
      });
      
      this.haWs.on('message', (data) => {
        this.handleHAMessage(JSON.parse(data.toString()));
      });
      
      this.haWs.on('close', () => {
        console.log('🔴 Home Assistant WebSocket closed, reconnecting in 5s...');
        this.authenticated = false;
        this.subscribed = false;
        this.scheduleReconnect();
      });
      
      this.haWs.on('error', (error) => {
        console.error('❌ Home Assistant WebSocket error:', error.message);
      });
    } catch (error) {
      console.error('❌ Failed to connect to HA:', error.message);
      this.scheduleReconnect();
    }
  }
  
  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }
  
  handleHAMessage(message) {
    switch (message.type) {
      case 'auth_required':
        this.authenticate();
        break;
        
      case 'auth_ok':
        console.log('✅ Authenticated with Home Assistant');
        this.authenticated = true;
        this.subscribeToEvents();
        break;
        
      case 'auth_invalid':
        console.error('❌ HA authentication failed:', message.message);
        break;
        
      case 'result':
        if (message.success && !this.subscribed) {
          console.log('✅ Subscribed to Home Assistant state changes');
          this.subscribed = true;
        }
        break;
        
      case 'event':
        if (message.event?.event_type === 'state_changed') {
          this.handleStateChange(message.event.data);
        }
        break;
    }
  }
  
  authenticate() {
    if (!this.haWs || this.haWs.readyState !== WebSocket.OPEN) return;
    
    this.haWs.send(JSON.stringify({
      type: 'auth',
      access_token: this.haToken
    }));
  }
  
  subscribeToEvents() {
    if (!this.haWs || this.haWs.readyState !== WebSocket.OPEN) return;
    
    this.haWs.send(JSON.stringify({
      id: this.messageId++,
      type: 'subscribe_events',
      event_type: 'state_changed'
    }));
  }
  
  handleStateChange(data) {
    const { entity_id, new_state, old_state } = data;
    
    // Skip if no meaningful change
    if (!new_state) return;
    
    // Create simplified event for clients
    const event = {
      type: 'state_changed',
      entity_id,
      state: new_state.state,
      attributes: new_state.attributes,
      last_changed: new_state.last_changed,
      last_updated: new_state.last_updated,
      old_state: old_state?.state,
      timestamp: Date.now()
    };
    
    // Add to buffer for new clients
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer.shift();
    }
    
    // Broadcast to all connected clients
    this.broadcast(event);
  }
  
  broadcast(event) {
    const message = JSON.stringify(event);
    let sent = 0;
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sent++;
      }
    });
    
    // Log significant state changes
    if (event.state !== event.old_state) {
      const shortId = event.entity_id.split('.')[1]?.substring(0, 20) || event.entity_id;
      console.log(`📡 ${shortId}: ${event.old_state} → ${event.state} (${sent} clients)`);
    }
  }
  
  // Add a frontend client
  addClient(ws) {
    this.clients.add(ws);
    console.log(`👤 Client connected (${this.clients.size} total)`);
    
    // Send connection status
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      ha_connected: this.authenticated,
      buffered_events: this.eventBuffer.length
    }));
    
    // Send recent events buffer
    if (this.eventBuffer.length > 0) {
      ws.send(JSON.stringify({
        type: 'event_buffer',
        events: this.eventBuffer.slice(-20) // Last 20 events
      }));
    }
    
    ws.on('close', () => {
      this.clients.delete(ws);
      console.log(`👤 Client disconnected (${this.clients.size} total)`);
    });
    
    ws.on('error', (error) => {
      console.error('Client WebSocket error:', error.message);
      this.clients.delete(ws);
    });
  }
  
  // Get current connection status
  getStatus() {
    return {
      ha_connected: this.authenticated,
      ha_subscribed: this.subscribed,
      clients_connected: this.clients.size,
      events_buffered: this.eventBuffer.length
    };
  }
}

// Singleton instance
let instance = null;

export function getHAWebSocketManager() {
  if (!instance) {
    instance = new HAWebSocketManager();
  }
  return instance;
}

export default HAWebSocketManager;
