import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CalendarIcon } from '@radix-ui/react-icons';
import { Card, Badge } from '../components/ui';

const CalendarWidget = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/calendar/events`);
        setEvents(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch calendar events:', err);
        setError('Failed to load calendar events');
        setLoading(false);
      }
    };

    fetchEvents();
    
    // Refresh every 15 minutes
    const interval = setInterval(fetchEvents, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatEventTime = (startDate, endDate, allDay) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    if (allDay) {
      if (start.toDateString() === now.toDateString()) {
        return 'All Day';
      } else {
        return start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      }
    }
    
    if (start.toDateString() === now.toDateString()) {
      return start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } else {
      return start.toLocaleDateString(undefined, { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    }
  };

  const getEventType = (title) => {
    const lower = title.toLowerCase();
    if (lower.includes('meeting') || lower.includes('call')) return 'work';
    if (lower.includes('football') || lower.includes('sport') || lower.includes('training')) return 'activity';
    if (lower.includes('family') || lower.includes('dinner') || lower.includes('birthday')) return 'family';
    if (lower.includes('appointment') || lower.includes('dentist') || lower.includes('doctor')) return 'appointment';
    return 'routine';
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <CalendarIcon className="w-5 h-5" />
          Today's Events
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-slate-800/50">
              <div className="animate-pulse flex items-center gap-3">
                <div className="w-16 h-6 bg-teal-500/20 rounded"></div>
                <div className="flex-1">
                  <div className="w-32 h-4 bg-slate-600 rounded mb-2"></div>
                  <div className="w-16 h-3 bg-slate-600 rounded"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <CalendarIcon className="w-5 h-5" />
          Today's Events
        </h2>
        <Card className="bg-slate-800/50">
          <div className="text-slate-400 text-center text-sm">
            {error}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
        <CalendarIcon className="w-5 h-5" />
        Today's Events
      </h2>
      <div className="space-y-3">
        {events.length === 0 ? (
          <Card className="bg-slate-800/50">
            <div className="text-slate-400 text-center text-sm">
              No upcoming events
            </div>
          </Card>
        ) : (
          events.slice(0, 5).map((event) => (
            <Card key={event.id} className="bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="text-teal-400 font-mono text-sm bg-teal-500/20 px-2 py-1 rounded">
                  {formatEventTime(event.start, event.end, event.allDay)}
                </div>
                <div className="flex-1">
                  <div className="text-white text-sm">{event.title}</div>
                  <Badge 
                    variant={
                      getEventType(event.title) === 'work' ? 'default' :
                      getEventType(event.title) === 'activity' ? 'warning' :
                      getEventType(event.title) === 'family' ? 'teal' :
                      getEventType(event.title) === 'appointment' ? 'purple' : 'default'
                    }
                    className="text-xs"
                  >
                    {getEventType(event.title)}
                  </Badge>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CalendarWidget;