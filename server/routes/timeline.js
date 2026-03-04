import express from 'express';
import pkg from 'tsdav';
const { createDAVClient } = pkg;
import NodeCache from 'node-cache';

const router = express.Router();
const timelineCache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

// Helper function to get today's date range
function getTodayRange() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  return { startOfDay, endOfDay };
}

// Helper function to parse ICS data (same as calendar.js)
function parseICSData(icsData) {
  const events = [];
  const lines = icsData.split('\n');
  let currentEvent = null;

  for (let line of lines) {
    line = line.trim();
    
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.summary) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);
        
        if (key === 'SUMMARY') {
          currentEvent.summary = value;
        } else if (key === 'DESCRIPTION') {
          currentEvent.description = value;
        } else if (key.startsWith('DTSTART')) {
          const isAllDay = !key.includes('TZID') && value.length === 8;
          currentEvent.startDate = parseICSDate(value);
          currentEvent.allDay = isAllDay;
        } else if (key.startsWith('DTEND')) {
          currentEvent.endDate = parseICSDate(value);
        } else if (key === 'UID') {
          currentEvent.uid = value;
        }
      }
    }
  }
  
  return events;
}

function parseICSDate(dateStr) {
  if (dateStr.length === 8) {
    // Date only (YYYYMMDD)
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return new Date(`${year}-${month}-${day}`);
  } else {
    // DateTime (YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ)
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(9, 11);
    const minute = dateStr.substring(11, 13);
    const second = dateStr.substring(13, 15);
    
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${dateStr.endsWith('Z') ? 'Z' : ''}`);
  }
}

// Fetch calendar events for today
async function fetchCalendarEvents() {
  try {
    if (!process.env.CALDAV_USER || !process.env.CALDAV_PASSWORD) {
      console.log('Calendar credentials not configured, skipping calendar events');
      return [];
    }

    const client = await createDAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: {
        username: process.env.CALDAV_USER,
        password: process.env.CALDAV_PASSWORD
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav'
    });

    const { startOfDay, endOfDay } = getTodayRange();

    const calendars = await client.fetchCalendars();
    const homeCalendar = calendars.find(cal => 
      cal.url.includes('845FE01D-0989-4958-86CD-3EBFC8AA1791')
    );

    if (!homeCalendar) {
      console.log('Home calendar not found');
      return [];
    }

    const calendarObjects = await client.fetchCalendarObjects({
      calendar: homeCalendar,
      timeRange: {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString()
      }
    });

    const events = [];
    for (const calObj of calendarObjects) {
      if (calObj.data) {
        const parsed = parseICSData(calObj.data);
        events.push(...parsed);
      }
    }

    return events
      .filter(event => {
        const eventStart = new Date(event.startDate);
        return eventStart >= startOfDay && eventStart <= endOfDay;
      })
      .map(event => ({
        type: 'calendar',
        title: event.summary,
        description: event.description || null,
        timestamp: event.startDate,
        endTime: event.endDate,
        allDay: event.allDay,
        source: 'Calendar',
        severity: 'info',
        metadata: {
          uid: event.uid
        }
      }));
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    return [];
  }
}

// Fetch Home Assistant events/logs for today
async function fetchHAEvents() {
  try {
    // This is a simplified implementation
    // In practice, you'd want to fetch actual HA logs or state changes
    const events = [];
    
    // Add some example system events
    const { startOfDay } = getTodayRange();
    
    // System startup event (if it happened today)
    events.push({
      type: 'system',
      title: 'Mission Control Started',
      description: 'Dashboard system initialization completed',
      timestamp: new Date(startOfDay.getTime() + 8 * 60 * 60 * 1000), // 8 AM
      source: 'System',
      severity: 'info'
    });

    return events;
  } catch (error) {
    console.error('Failed to fetch HA events:', error);
    return [];
  }
}

// Fetch weather events for today
async function fetchWeatherEvents() {
  try {
    const { startOfDay } = getTodayRange();
    const events = [];

    // Fetch weather forecast for significant changes
    const response = await fetch('https://wttr.in/Crackington+Haven?format=j1');
    if (!response.ok) return events;
    
    const weather = await response.json();
    
    // Add sunrise/sunset
    if (weather.weather && weather.weather[0]) {
      const today = weather.weather[0];
      
      if (today.astronomy && today.astronomy[0]) {
        const astronomy = today.astronomy[0];
        
        // Parse sunrise time
        if (astronomy.sunrise) {
          const [hour, minute] = astronomy.sunrise.split(':');
          const sunrise = new Date(startOfDay);
          sunrise.setHours(parseInt(hour), parseInt(minute));
          
          events.push({
            type: 'weather',
            title: 'Sunrise',
            description: `Sun rises at ${astronomy.sunrise}`,
            timestamp: sunrise,
            source: 'Weather',
            severity: 'info'
          });
        }
        
        // Parse sunset time
        if (astronomy.sunset) {
          const [hour, minute] = astronomy.sunset.split(':');
          const sunset = new Date(startOfDay);
          sunset.setHours(parseInt(hour), parseInt(minute));
          
          events.push({
            type: 'weather',
            title: 'Sunset',
            description: `Sun sets at ${astronomy.sunset}`,
            timestamp: sunset,
            source: 'Weather',
            severity: 'info'
          });
        }
      }
    }

    return events;
  } catch (error) {
    console.error('Failed to fetch weather events:', error);
    return [];
  }
}

// Generate mock system events for demonstration
function generateMockEvents() {
  const { startOfDay } = getTodayRange();
  const events = [];
  const now = new Date();

  // Add some past events
  events.push({
    type: 'system',
    title: 'Daily Backup Completed',
    description: 'Automated system backup finished successfully',
    timestamp: new Date(startOfDay.getTime() + 6 * 60 * 60 * 1000), // 6 AM
    source: 'HomeServer',
    severity: 'info'
  });

  events.push({
    type: 'home_assistant',
    title: 'Heating Turned On',
    description: 'Climate control activated - target 21°C',
    timestamp: new Date(startOfDay.getTime() + 7 * 60 * 60 * 1000), // 7 AM
    source: 'Home Assistant',
    severity: 'info'
  });

  events.push({
    type: 'automation',
    title: 'Morning Routine Started',
    description: 'Automated morning sequence initiated',
    timestamp: new Date(startOfDay.getTime() + 7 * 60 * 60 * 1000 + 30 * 60 * 1000), // 7:30 AM
    source: 'Home Assistant',
    severity: 'info'
  });

  // Add current hour event if it's during day
  const currentHour = now.getHours();
  if (currentHour >= 8 && currentHour <= 22) {
    events.push({
      type: 'energy',
      title: 'High Energy Usage Detected',
      description: 'Power consumption above 2kW',
      timestamp: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
      source: 'Energy Monitor',
      severity: 'warning'
    });
  }

  // Add future events
  events.push({
    type: 'automation',
    title: 'Evening Routine Scheduled',
    description: 'Automated evening sequence will start',
    timestamp: new Date(startOfDay.getTime() + 18 * 60 * 60 * 1000), // 6 PM
    source: 'Home Assistant',
    severity: 'info'
  });

  events.push({
    type: 'system',
    title: 'Weekly Report Generation',
    description: 'System performance report will be generated',
    timestamp: new Date(startOfDay.getTime() + 23 * 60 * 60 * 1000), // 11 PM
    source: 'HomeServer',
    severity: 'info'
  });

  return events;
}

// Main timeline endpoint
router.get('/today', async (req, res) => {
  try {
    // Check cache first
    const cached = timelineCache.get('today_timeline');
    if (cached) {
      console.log('Returning cached timeline data');
      return res.json({ success: true, events: cached });
    }

    console.log('Fetching fresh timeline data...');

    // Fetch all event sources in parallel
    const [calendarEvents, haEvents, weatherEvents] = await Promise.allSettled([
      fetchCalendarEvents(),
      fetchHAEvents(),
      fetchWeatherEvents()
    ]);

    // Combine all events
    const allEvents = [
      ...(calendarEvents.status === 'fulfilled' ? calendarEvents.value : []),
      ...(haEvents.status === 'fulfilled' ? haEvents.value : []),
      ...(weatherEvents.status === 'fulfilled' ? weatherEvents.value : []),
      ...generateMockEvents() // Add mock events for demonstration
    ];

    // Sort by timestamp
    allEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Cache the results
    timelineCache.set('today_timeline', allEvents);

    console.log(`Timeline data compiled: ${allEvents.length} events`);

    res.json({
      success: true,
      events: allEvents,
      generated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Timeline endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch timeline data',
      details: error.message
    });
  }
});

// Clear timeline cache endpoint
router.post('/refresh', (req, res) => {
  timelineCache.del('today_timeline');
  res.json({ success: true, message: 'Timeline cache cleared' });
});

export default router;