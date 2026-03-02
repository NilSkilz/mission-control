import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * WebSocket hook for real-time Home Assistant state updates
 * Connects to the Mission Control API WebSocket and receives state changes
 */
export function useHAWebSocket() {
  const [connected, setConnected] = useState(false);
  const [haConnected, setHaConnected] = useState(false);
  const [states, setStates] = useState({});
  const [recentEvents, setRecentEvents] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    // Determine WebSocket URL based on environment
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.PROD 
      ? 'api.cracky.co.uk' 
      : window.location.hostname + ':3001';
    const wsUrl = `${wsProtocol}//${wsHost}/ws`;
    
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected');
        setConnected(true);
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
      };
      
      wsRef.current.onclose = () => {
        console.log('🔴 WebSocket closed, reconnecting in 3s...');
        setConnected(false);
        setHaConnected(false);
        scheduleReconnect();
      };
      
      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      scheduleReconnect();
    }
  }, []);
  
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) return;
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      connect();
    }, 3000);
  }, [connect]);
  
  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'connection':
        setHaConnected(data.ha_connected);
        console.log('📡 HA connection status:', data.ha_connected);
        break;
        
      case 'event_buffer':
        // Process buffered events to build initial state
        if (data.events) {
          const newStates = {};
          data.events.forEach(event => {
            newStates[event.entity_id] = {
              state: event.state,
              attributes: event.attributes,
              last_changed: event.last_changed,
              last_updated: event.last_updated
            };
          });
          setStates(prev => ({ ...prev, ...newStates }));
          setRecentEvents(data.events.slice(-10));
        }
        break;
        
      case 'state_changed':
        // Update single entity state
        setStates(prev => ({
          ...prev,
          [data.entity_id]: {
            state: data.state,
            attributes: data.attributes,
            last_changed: data.last_changed,
            last_updated: data.last_updated
          }
        }));
        
        // Add to recent events (keep last 20)
        setRecentEvents(prev => {
          const newEvents = [...prev, data].slice(-20);
          return newEvents;
        });
        break;
    }
  }, []);
  
  // Connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);
  
  // Helper to get a specific entity state
  const getState = useCallback((entityId) => {
    return states[entityId] || null;
  }, [states]);
  
  // Helper to get entities matching a pattern
  const getEntitiesByDomain = useCallback((domain) => {
    return Object.entries(states)
      .filter(([id]) => id.startsWith(`${domain}.`))
      .reduce((acc, [id, state]) => {
        acc[id] = state;
        return acc;
      }, {});
  }, [states]);
  
  return {
    connected,
    haConnected,
    states,
    recentEvents,
    getState,
    getEntitiesByDomain
  };
}

export default useHAWebSocket;
