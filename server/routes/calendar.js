import express from 'express';
import pkg from 'tsdav';
const { createDAVClient } = pkg;
import NodeCache from 'node-cache';

const router = express.Router();
const eventCache = new NodeCache({ stdTTL: 900 }); // 15 minutes cache

router.get('/events', async (req, res) => {
  try {
    // Check cache first
    const cachedEvents = eventCache.get('calendar_events');
    if (cachedEvents) {
      return res.json(cachedEvents);
    }

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

    // Fetch calendars
    const calendars = await client.fetchCalendars();
    const homeCalendar = calendars.find(cal => 
      cal.url.includes('845FE01D-0989-4958-86CD-3EBFC8AA1791')
    );

    if (!homeCalendar) {
      return res.status(404).json({ error: 'Home calendar not found' });
    }

    // Calculate date range (today + next 7 days)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    // Fetch events
    const events = await client.fetchCalendarObjects({
      calendar: homeCalendar,
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });

    // Transform events
    const processedEvents = events.map(event => ({
      id: event.url,
      title: event.summary || 'Untitled Event',
      start: event.startDate,
      end: event.endDate,
      allDay: event.allDay || false
    }));

    // Cache events
    eventCache.set('calendar_events', processedEvents);

    res.json(processedEvents);
  } catch (error) {
    console.error('Calendar fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

export default router;