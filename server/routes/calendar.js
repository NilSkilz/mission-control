import express from 'express';
import pkg from 'tsdav';
const { createDAVClient } = pkg;
import NodeCache from 'node-cache';

const router = express.Router();
const eventCache = new NodeCache({ stdTTL: 900 }); // 15 minutes cache

// Helper function to parse ICS data
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

router.get('/events', async (req, res) => {
  try {
    // Check cache first
    const cachedEvents = eventCache.get('calendar_events');
    if (cachedEvents) {
      console.log('Returning cached calendar events');
      return res.json(cachedEvents);
    }

    console.log('Fetching fresh calendar events from iCloud...');

    // Create CalDAV client
    const client = await createDAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: {
        username: process.env.CALDAV_USER,
        password: process.env.CALDAV_PASSWORD
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav'
    });

    // Calculate date range (today + next 7 days)
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);

    console.log(`Fetching events from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch calendars first
    const calendars = await client.fetchCalendars();
    console.log(`Found ${calendars.length} calendars`);

    const homeCalendar = calendars.find(cal => 
      cal.url.includes('845FE01D-0989-4958-86CD-3EBFC8AA1791')
    );

    if (!homeCalendar) {
      console.error('Home calendar not found. Available calendars:');
      calendars.forEach(cal => console.log(`- ${cal.displayName}: ${cal.url}`));
      return res.status(404).json({ error: 'Home calendar not found' });
    }

    console.log(`Using calendar: ${homeCalendar.displayName}`);

    // Fetch events
    const calendarObjects = await client.fetchCalendarObjects({
      calendar: homeCalendar,
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });

    console.log(`Raw calendar objects fetched: ${calendarObjects.length}`);

    // Parse and transform events
    const allEvents = [];
    for (const calObj of calendarObjects) {
      if (calObj.data) {
        const parsed = parseICSData(calObj.data);
        allEvents.push(...parsed);
      }
    }

    // Filter events within date range and sort by start time
    const now = new Date();
    const processedEvents = allEvents
      .filter(event => {
        const eventStart = new Date(event.startDate);
        return eventStart >= startDate && eventStart <= endDate;
      })
      .map(event => ({
        id: event.uid || Math.random().toString(36),
        title: event.summary || 'Untitled Event',
        start: event.startDate,
        end: event.endDate,
        allDay: event.allDay || false
      }))
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    console.log(`Processed ${processedEvents.length} events`);

    // Cache events
    eventCache.set('calendar_events', processedEvents);

    res.json(processedEvents);
  } catch (error) {
    console.error('Calendar fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch calendar events',
      details: error.message 
    });
  }
});

export default router;