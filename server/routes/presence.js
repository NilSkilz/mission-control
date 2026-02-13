import express from 'express';
import pkg from 'tsdav';
const { createDAVClient } = pkg;
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Presence data file location
const PRESENCE_FILE = path.join(__dirname, '../../db/presence.json');

// Family members to track
const FAMILY = {
  rob: {
    name: 'Rob',
    emoji: '👨',
    // Patterns that indicate Rob is AWAY (case-insensitive)
    awayPatterns: [
      /\brob\b.*\b(office|cheltenham|cinderford|away|trip)\b/i,
      /\b(office|cheltenham|cinderford)\b.*\brob\b/i,
      /^office$/i,
      /^cheltenham$/i,
      /^rob away/i,
      /^rob in /i,
    ],
  },
  aimee: {
    name: 'Aimee',
    emoji: '👩',
    // Patterns that indicate Aimee is AWAY
    awayPatterns: [
      /\baimee\b.*\b(andover|away|trip)\b/i,
      /\b(andover)\b.*\baimee\b/i,
      /^andover$/i,
      /^aimee away/i,
      /^aimee in /i,
    ],
  },
  dexter: {
    name: 'Dexter',
    emoji: '👦',
    // Patterns that indicate Dexter is AWAY
    awayPatterns: [
      /\bdexter\b.*\b(away|sleepover|trip|camp)\b/i,
      /\bdexter at /i,
      /^dexter away/i,
    ],
  },
  logan: {
    name: 'Logan',
    emoji: '👦',
    // Patterns that indicate Logan is AWAY
    awayPatterns: [
      /\blogan\b.*\b(away|sleepover|trip|camp)\b/i,
      /\blogan at /i,
      /^logan away/i,
    ],
  },
};

// Check if an event title indicates someone is away
function checkEventForAbsence(eventTitle, member) {
  const config = FAMILY[member];
  if (!config) return false;
  
  return config.awayPatterns.some(pattern => pattern.test(eventTitle));
}

// Parse ICS data (reused from calendar.js)
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
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return new Date(`${year}-${month}-${day}`);
  } else {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(9, 11);
    const minute = dateStr.substring(11, 13);
    const second = dateStr.substring(13, 15);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${dateStr.endsWith('Z') ? 'Z' : ''}`);
  }
}

// Format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Get all dates between start and end (inclusive)
function getDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

// Generate presence data from calendar events
async function generatePresenceData(weeksAhead = 3) {
  console.log(`Generating presence data for ${weeksAhead} weeks ahead...`);
  
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

  // Calculate date range
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (weeksAhead * 7));
  endDate.setHours(23, 59, 59, 999);

  console.log(`Date range: ${formatDate(startDate)} to ${formatDate(endDate)}`);

  // Fetch calendars
  const calendars = await client.fetchCalendars();
  const homeCalendar = calendars.find(cal => 
    cal.url.includes('845FE01D-0989-4958-86CD-3EBFC8AA1791')
  );

  if (!homeCalendar) {
    throw new Error('Home calendar not found');
  }

  // Fetch events
  const calendarObjects = await client.fetchCalendarObjects({
    calendar: homeCalendar,
    timeRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    }
  });

  // Parse all events
  const allEvents = [];
  for (const calObj of calendarObjects) {
    if (calObj.data) {
      const parsed = parseICSData(calObj.data);
      allEvents.push(...parsed);
    }
  }

  console.log(`Found ${allEvents.length} events in range`);

  // Initialize presence data - everyone home by default
  const presenceData = {
    generated: new Date().toISOString(),
    rangeStart: formatDate(startDate),
    rangeEnd: formatDate(endDate),
    days: {},
    events: [], // Store matched events for debugging
  };

  // Initialize all days with everyone present
  const allDates = getDateRange(startDate, endDate);
  for (const dateStr of allDates) {
    presenceData.days[dateStr] = {
      rob: true,
      aimee: true,
      dexter: true,
      logan: true,
      headcount: 4,
      notes: [],
    };
  }

  // Process events and mark absences
  for (const event of allEvents) {
    if (!event.summary || !event.startDate) continue;

    const title = event.summary;
    const eventStart = new Date(event.startDate);
    const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;

    // Check each family member
    for (const member of Object.keys(FAMILY)) {
      if (checkEventForAbsence(title, member)) {
        // Get all dates this event spans
        const eventDates = getDateRange(eventStart, eventEnd);
        
        // For all-day events that end at midnight, the end date is actually the next day
        // So we might need to exclude the last date
        if (event.allDay && eventDates.length > 1) {
          eventDates.pop(); // Remove the "day after" for all-day events
        }

        for (const dateStr of eventDates) {
          if (presenceData.days[dateStr]) {
            presenceData.days[dateStr][member] = false;
            presenceData.days[dateStr].notes.push(`${FAMILY[member].name}: ${title}`);
          }
        }

        presenceData.events.push({
          title,
          member,
          start: formatDate(eventStart),
          end: formatDate(eventEnd),
        });
      }
    }
  }

  // Recalculate headcounts
  for (const dateStr of allDates) {
    const day = presenceData.days[dateStr];
    day.headcount = [day.rob, day.aimee, day.dexter, day.logan].filter(Boolean).length;
  }

  return presenceData;
}

// GET /api/presence - Get current presence data
router.get('/', async (req, res) => {
  try {
    const data = await fs.readFile(PRESENCE_FILE, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, generate it
      console.log('Presence file not found, generating...');
      try {
        const presenceData = await generatePresenceData();
        await fs.writeFile(PRESENCE_FILE, JSON.stringify(presenceData, null, 2));
        res.json(presenceData);
      } catch (genError) {
        console.error('Error generating presence data:', genError);
        res.status(500).json({ error: 'Failed to generate presence data', details: genError.message });
      }
    } else {
      console.error('Error reading presence file:', error);
      res.status(500).json({ error: 'Failed to read presence data' });
    }
  }
});

// POST /api/presence/refresh - Regenerate presence data
router.post('/refresh', async (req, res) => {
  try {
    const weeksAhead = req.body?.weeks || 3;
    const presenceData = await generatePresenceData(weeksAhead);
    await fs.writeFile(PRESENCE_FILE, JSON.stringify(presenceData, null, 2));
    console.log(`Presence data regenerated (${Object.keys(presenceData.days).length} days)`);
    res.json({ success: true, days: Object.keys(presenceData.days).length, events: presenceData.events.length });
  } catch (error) {
    console.error('Error regenerating presence data:', error);
    res.status(500).json({ error: 'Failed to regenerate presence data', details: error.message });
  }
});

// GET /api/presence/day/:date - Get presence for a specific day
router.get('/day/:date', async (req, res) => {
  try {
    const data = await fs.readFile(PRESENCE_FILE, 'utf-8');
    const presence = JSON.parse(data);
    const dayData = presence.days[req.params.date];
    
    if (dayData) {
      res.json(dayData);
    } else {
      res.status(404).json({ error: 'No data for this date' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read presence data' });
  }
});

export default router;
