import { useState, useEffect, useRef } from 'react';

/**
 * Activity Feed - Real-time stream of Home Assistant events
 * Shows state changes as they happen with auto-scroll
 */
export function ActivityFeed({ events = [], maxItems = 15, compact = false, className = '' }) {
  const feedRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Auto-scroll to bottom when new events arrive (unless user is hovering)
  useEffect(() => {
    if (feedRef.current && !isHovered) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events, isHovered]);
  
  // Format entity name for display
  const formatEntityName = (entityId) => {
    if (!entityId) return 'Unknown';
    const parts = entityId.split('.');
    if (parts.length < 2) return entityId;
    
    // Convert snake_case to Title Case
    const name = parts[1]
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    
    return name.length > 25 ? name.substring(0, 22) + '...' : name;
  };
  
  // Get icon and color for entity type
  const getEntityStyle = (entityId) => {
    const domain = entityId?.split('.')[0] || '';
    
    const styles = {
      light: { icon: '💡', color: 'text-yellow-400' },
      switch: { icon: '🔌', color: 'text-blue-400' },
      sensor: { icon: '📊', color: 'text-cyan-400' },
      binary_sensor: { icon: '⚡', color: 'text-purple-400' },
      climate: { icon: '🌡️', color: 'text-orange-400' },
      media_player: { icon: '🎵', color: 'text-green-400' },
      person: { icon: '👤', color: 'text-pink-400' },
      device_tracker: { icon: '📍', color: 'text-red-400' },
      automation: { icon: '⚙️', color: 'text-gray-400' },
      weather: { icon: '🌤️', color: 'text-sky-400' },
      update: { icon: '🔄', color: 'text-indigo-400' },
    };
    
    return styles[domain] || { icon: '•', color: 'text-gray-500' };
  };
  
  // Format time as relative
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const eventTime = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
    const diff = Math.floor((now - eventTime) / 1000);
    
    if (diff < 5) return 'now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };
  
  // Detect anomalies in state changes
  const detectAnomaly = (event) => {
    const { entity_id, state, old_state, attributes } = event;
    const newVal = parseFloat(state);
    const oldVal = parseFloat(old_state);
    
    // Skip non-numeric or unavailable states
    if (isNaN(newVal) || state === 'unavailable' || state === 'unknown') {
      return state === 'unavailable' ? { type: 'error', reason: 'Device unavailable' } : null;
    }
    
    // Power anomalies
    if (entity_id?.includes('power')) {
      if (newVal > 3000) return { type: 'alert', reason: 'Very high power usage' };
      if (newVal > 2000) return { type: 'warning', reason: 'High power usage' };
      // Sudden spike (>500W change)
      if (!isNaN(oldVal) && Math.abs(newVal - oldVal) > 500) {
        return { type: 'warning', reason: 'Sudden power change' };
      }
    }
    
    // Temperature anomalies
    if (entity_id?.includes('temperature') || attributes?.device_class === 'temperature') {
      if (newVal > 35) return { type: 'alert', reason: 'High temperature' };
      if (newVal < 10) return { type: 'warning', reason: 'Low temperature' };
      // Rapid change (>3°C)
      if (!isNaN(oldVal) && Math.abs(newVal - oldVal) > 3) {
        return { type: 'warning', reason: 'Rapid temp change' };
      }
    }
    
    // Voltage anomalies (should be ~230-240V)
    if (entity_id?.includes('voltage')) {
      if (newVal < 220 || newVal > 250) {
        return { type: 'warning', reason: 'Voltage outside range' };
      }
    }
    
    // Battery anomalies
    if (entity_id?.includes('battery') || attributes?.device_class === 'battery') {
      if (newVal < 20) return { type: 'warning', reason: 'Low battery' };
      if (newVal < 10) return { type: 'alert', reason: 'Critical battery' };
    }
    
    return null;
  };
  
  // Format state value for display
  const formatState = (state, oldState, anomaly) => {
    if (state === 'on') return <span className="text-green-400">ON</span>;
    if (state === 'off') return <span className="text-gray-500">OFF</span>;
    if (state === 'unavailable') return <span className="text-red-400">UNAVAIL</span>;
    if (state === 'unknown') return <span className="text-gray-600">???</span>;
    
    // Numeric values
    const num = parseFloat(state);
    if (!isNaN(num)) {
      const colorClass = anomaly?.type === 'alert' ? 'text-red-400' 
        : anomaly?.type === 'warning' ? 'text-yellow-400' 
        : 'text-cyan-400';
      return <span className={colorClass}>{num.toFixed(1)}</span>;
    }
    
    return <span className="text-gray-300">{state}</span>;
  };
  
  const displayEvents = events.slice(-maxItems);
  
  return (
    <div className={`bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} border-b border-gray-800 flex items-center justify-between`}>
        <div className="flex items-center gap-1.5">
          <span className="text-cyan-400 text-xs">{'// '}</span>
          <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-mono text-gray-400 uppercase tracking-wider`}>
            {compact ? 'ACTIVITY' : 'Activity Feed'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full ${events.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
          {!compact && <span className="text-xs text-gray-500 font-mono">{events.length}</span>}
        </div>
      </div>
      
      {/* Feed */}
      <div 
        ref={feedRef}
        className={`${compact ? 'max-h-32' : 'h-64'} overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {displayEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm font-mono">
            Waiting for events...
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {displayEvents.map((event, index) => {
              const style = getEntityStyle(event.entity_id);
              const isNew = index === displayEvents.length - 1;
              const anomaly = detectAnomaly(event);
              
              // Background based on anomaly
              const bgClass = anomaly?.type === 'alert' ? 'bg-red-900/20 border-l-2 border-red-500' 
                : anomaly?.type === 'warning' ? 'bg-yellow-900/10 border-l-2 border-yellow-500'
                : anomaly?.type === 'error' ? 'bg-red-900/10'
                : isNew ? 'bg-cyan-900/10' : '';
              
              return (
                <div 
                  key={`${event.entity_id}-${event.timestamp || index}`}
                  className={`${compact ? 'px-2 py-1' : 'px-3 py-2'} flex items-center ${compact ? 'gap-2' : 'gap-3'} hover:bg-gray-800/30 transition-colors ${bgClass}`}
                  title={anomaly?.reason}
                >
                  {/* Icon */}
                  <span className={compact ? 'text-xs' : 'text-sm'}>{anomaly ? '⚠️' : style.icon}</span>
                  
                  {/* Entity name */}
                  <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-mono flex-1 truncate ${anomaly ? 'text-yellow-300' : style.color}`}>
                    {formatEntityName(event.entity_id)}
                  </span>
                  
                  {/* State change */}
                  <div className={`${compact ? 'text-[10px]' : 'text-xs'} font-mono flex items-center gap-1`}>
                    {!compact && event.old_state && (
                      <>
                        <span className="text-gray-600">{event.old_state}</span>
                        <span className="text-gray-700">→</span>
                      </>
                    )}
                    {formatState(event.state, event.old_state, anomaly)}
                  </div>
                  
                  {/* Time - hide in compact */}
                  {!compact && (
                    <span className="text-xs text-gray-600 font-mono w-12 text-right">
                      {formatTime(event.timestamp)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityFeed;
