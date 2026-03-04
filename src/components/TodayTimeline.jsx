import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@radix-ui/react-icons';

/**
 * Today Timeline - Temporal view of the day's events
 * Shows past, present, and future events in chronological order
 */
export function TodayTimeline({ className = '', compact = false }) {
  const [timelineData, setTimelineData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(null);
  const [scrollPosition, setScrollPosition] = useState('current');
  const timelineRef = useRef(null);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch timeline data
  useEffect(() => {
    async function loadTimelineData() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/timeline/today');
        if (response.ok) {
          const data = await response.json();
          setTimelineData(data.events || []);
        }
      } catch (error) {
        console.error('Failed to load timeline data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadTimelineData();
    // Refresh timeline data every 15 minutes
    const interval = setInterval(loadTimelineData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Process timeline data into hourly buckets
  const timelineBuckets = useMemo(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const buckets = [];

    // Create 24 hour buckets
    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(startOfDay.getTime() + hour * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      const isPast = hourEnd <= currentTime;
      const isCurrent = hourStart <= currentTime && currentTime < hourEnd;
      const isFuture = hourStart > currentTime;

      // Find events for this hour
      const events = timelineData.filter(event => {
        const eventTime = new Date(event.timestamp);
        return eventTime >= hourStart && eventTime < hourEnd;
      });

      buckets.push({
        hour,
        hourStart,
        hourEnd,
        isPast,
        isCurrent,
        isFuture,
        events,
        hasEvents: events.length > 0
      });
    }

    return buckets;
  }, [timelineData, currentTime]);

  // Scroll to current time on load
  useEffect(() => {
    if (timelineRef.current && scrollPosition === 'current') {
      const currentHour = currentTime.getHours();
      const hourElement = timelineRef.current.querySelector(`[data-hour="${currentHour}"]`);
      if (hourElement) {
        hourElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [timelineData, scrollPosition, currentTime]);

  // Get event icon based on type
  const getEventIcon = (event) => {
    const icons = {
      calendar: '📅',
      system: '⚙️',
      home_assistant: '🏠',
      weather: '🌤️',
      energy: '⚡',
      security: '🔒',
      automation: '🤖',
      notification: '🔔',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[event.type] || '•';
  };

  // Get event color based on type and severity
  const getEventColor = (event) => {
    if (event.severity === 'critical') return 'text-red-400 bg-red-900/20';
    if (event.severity === 'warning') return 'text-yellow-400 bg-yellow-900/20';
    if (event.severity === 'info') return 'text-blue-400 bg-blue-900/20';
    
    const colors = {
      calendar: 'text-purple-400 bg-purple-900/20',
      system: 'text-cyan-400 bg-cyan-900/20',
      home_assistant: 'text-green-400 bg-green-900/20',
      weather: 'text-sky-400 bg-sky-900/20',
      energy: 'text-yellow-400 bg-yellow-900/20',
      security: 'text-red-400 bg-red-900/20',
      automation: 'text-indigo-400 bg-indigo-900/20'
    };
    return colors[event.type] || 'text-slate-400 bg-slate-900/20';
  };

  // Format time for display
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Format hour label
  const formatHour = (hour) => {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Navigation functions
  const scrollToTop = () => {
    setScrollPosition('top');
    timelineRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToCurrent = () => {
    setScrollPosition('current');
    const currentHour = currentTime.getHours();
    const hourElement = timelineRef.current?.querySelector(`[data-hour="${currentHour}"]`);
    if (hourElement) {
      hourElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const scrollToBottom = () => {
    setScrollPosition('bottom');
    timelineRef.current?.scrollTo({ 
      top: timelineRef.current.scrollHeight, 
      behavior: 'smooth' 
    });
  };

  if (isLoading) {
    return (
      <div className={`bg-slate-800/50 border border-slate-600/30 rounded-lg ${className}`}>
        <div className="p-4 text-center">
          <div className="animate-pulse text-cyan-400 text-sm font-mono">
            Loading timeline...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800/50 border border-slate-600/30 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} border-b border-slate-600/30 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 text-xs font-mono">// TODAY</span>
          <span className={`${compact ? 'text-xs' : 'text-sm'} text-slate-400 font-mono`}>
            {currentTime.toLocaleDateString('en-GB', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={scrollToTop}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
            title="Scroll to start of day"
          >
            <ChevronUpIcon className="w-4 h-4" />
          </button>
          <button
            onClick={scrollToCurrent}
            className="px-2 py-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors font-mono"
            title="Scroll to current time"
          >
            NOW
          </button>
          <button
            onClick={scrollToBottom}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
            title="Scroll to end of day"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div 
        ref={timelineRef}
        className={`${compact ? 'max-h-64' : 'h-96'} overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent`}
      >
        <div className="relative">
          {/* Central timeline line */}
          <div className="absolute left-12 top-0 bottom-0 w-px bg-gradient-to-b from-slate-600 via-cyan-500/50 to-slate-600" />

          {/* Hour buckets */}
          <div className="space-y-0">
            {timelineBuckets.map((bucket) => (
              <div
                key={bucket.hour}
                data-hour={bucket.hour}
                className={`relative flex items-start gap-4 py-2 px-4 ${
                  bucket.isCurrent ? 'bg-cyan-900/10 border-l-2 border-cyan-400' : ''
                } ${bucket.hasEvents ? 'min-h-16' : 'min-h-8'}`}
              >
                {/* Time marker */}
                <div className="flex-shrink-0 w-8 pt-1">
                  <div className={`text-xs font-mono ${
                    bucket.isCurrent ? 'text-cyan-400 font-semibold' : 
                    bucket.isPast ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    {formatHour(bucket.hour)}
                  </div>
                </div>

                {/* Timeline node */}
                <div className="relative flex-shrink-0 w-4 h-4 mt-1">
                  <div className={`absolute inset-0 rounded-full border-2 ${
                    bucket.isCurrent ? 'border-cyan-400 bg-cyan-400' :
                    bucket.hasEvents ? 'border-slate-400 bg-slate-800' :
                    'border-slate-600 bg-slate-800'
                  }`}>
                    {bucket.isCurrent && (
                      <div className="absolute inset-0 rounded-full animate-ping border-2 border-cyan-400" />
                    )}
                  </div>
                </div>

                {/* Events */}
                <div className="flex-1 min-w-0">
                  {bucket.hasEvents ? (
                    <div className="space-y-2">
                      {bucket.events.map((event, index) => (
                        <div
                          key={`${bucket.hour}-${index}`}
                          className={`group flex items-start gap-2 p-2 rounded border ${getEventColor(event)} hover:bg-opacity-30 transition-colors cursor-pointer`}
                          onClick={() => setSelectedHour(bucket.hour)}
                        >
                          <span className="text-sm mt-0.5">{getEventIcon(event)}</span>
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-medium ${compact ? 'line-clamp-1' : ''}`}>
                              {event.title || event.summary || 'Untitled Event'}
                            </div>
                            {!compact && event.description && (
                              <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                                {event.description}
                              </div>
                            )}
                            <div className="text-xs text-slate-500 mt-1 font-mono">
                              {formatTime(new Date(event.timestamp))}
                              {event.source && ` • ${event.source}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 font-mono pt-1">
                      {bucket.isCurrent ? 'No events right now' : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current time indicator */}
      <div className={`${compact ? 'px-3 py-2' : 'px-4 py-2'} border-t border-slate-600/30 bg-slate-800/30`}>
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500">Current time</span>
          <span className="text-cyan-400 font-semibold">
            {formatTime(currentTime)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default TodayTimeline;