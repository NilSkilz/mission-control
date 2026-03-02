import express from 'express';
import NodeCache from 'node-cache';
import { detectEventContext } from '../lib/eventDetection.js';

const router = express.Router();
const eventCache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

// Helper to get calendar events from the calendar route
async function getCalendarEvents() {
  try {
    // Import the calendar module to access events
    const calendarModule = await import('./calendar.js');
    // For now, we'll return null and let the client handle calendar integration
    // In a full implementation, we'd make an internal API call here
    return null;
  } catch (error) {
    console.error('Failed to get calendar events for event detection:', error);
    return null;
  }
}

// Get current event context
router.get('/context', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'event_context';
    const cachedContext = eventCache.get(cacheKey);
    
    if (cachedContext) {
      console.log('Returning cached event context');
      return res.json(cachedContext);
    }

    console.log('Detecting fresh event context...');
    
    // Get calendar events (would be integrated properly in production)
    const calendarEvents = await getCalendarEvents();
    
    // Detect current context
    const context = detectEventContext(new Date(), calendarEvents);
    
    // Cache the result
    eventCache.set(cacheKey, context);
    
    console.log('Event context detected:', {
      season: context.season,
      holidayCount: context.holidays.length,
      upcomingCount: context.upcomingHolidays.length,
      specialPeriod: context.specialPeriod?.name || 'none',
      birthdayCount: context.birthdays.length,
      familyEventCount: context.familyEvents.length
    });
    
    res.json(context);
  } catch (error) {
    console.error('Event context detection error:', error);
    res.status(500).json({ 
      error: 'Failed to detect event context',
      details: error.message 
    });
  }
});

// Get theme suggestions based on current context
router.get('/theme', async (req, res) => {
  try {
    const cacheKey = 'event_theme';
    const cachedTheme = eventCache.get(cacheKey);
    
    if (cachedTheme) {
      return res.json(cachedTheme);
    }

    // Get event context
    const calendarEvents = await getCalendarEvents();
    const context = detectEventContext(new Date(), calendarEvents);
    
    // Determine theme modifications
    const themeData = {
      context,
      suggestions: {
        seasonal: context.season,
        primary: null,
        callouts: []
      }
    };
    
    // Add holiday callouts
    if (context.holidays.length > 0) {
      themeData.suggestions.callouts.push(
        ...context.holidays.map(h => ({
          type: 'holiday',
          message: `Today is ${h.name}! ✨`,
          priority: 10
        }))
      );
      themeData.suggestions.primary = context.holidays[0].type;
    }
    
    // Add birthday callouts
    const todayBirthdays = context.birthdays.filter(b => b.daysAway === 0);
    if (todayBirthdays.length > 0) {
      themeData.suggestions.callouts.push({
        type: 'birthday',
        message: `Birthday today! 🎂`,
        priority: 10
      });
      themeData.suggestions.primary = 'birthday';
    }
    
    // Add upcoming birthday callouts
    const upcomingBirthdays = context.birthdays.filter(b => b.daysAway > 0 && b.daysAway <= 2);
    for (const birthday of upcomingBirthdays) {
      themeData.suggestions.callouts.push({
        type: 'upcoming_birthday',
        message: `Birthday ${birthday.daysAway === 1 ? 'tomorrow' : `in ${birthday.daysAway} days`}: ${birthday.name}`,
        priority: 7
      });
    }
    
    // Add family event callouts
    const todayFamilyEvents = context.familyEvents.filter(e => e.daysAway === 0);
    if (todayFamilyEvents.length > 0) {
      themeData.suggestions.callouts.push({
        type: 'family',
        message: 'Family event today! 👨‍👩‍👧‍👦',
        priority: 8
      });
    }
    
    // Add special period callouts
    if (context.specialPeriod) {
      const periodMessages = {
        christmas_countdown: 'Christmas countdown! 🎄',
        christmas_week: 'Christmas week! 🎅',
        spooky_season: 'Spooky season! 🎃',
        halloween: 'Happy Halloween! 👻',
        valentine_season: 'Love is in the air! 💕',
        new_year: 'New Year vibes! ✨'
      };
      
      const message = periodMessages[context.specialPeriod.name] || 
                     context.specialPeriod.name.replace(/_/g, ' ');
      
      themeData.suggestions.callouts.push({
        type: 'special_period',
        message,
        priority: context.specialPeriod.type === 'christmas' ? 9 : 6
      });
      
      if (!themeData.suggestions.primary) {
        themeData.suggestions.primary = context.specialPeriod.type;
      }
    }
    
    // Add upcoming holiday callouts
    const soonHolidays = context.upcomingHolidays.filter(h => h.daysAway > 0 && h.daysAway <= 3);
    for (const holiday of soonHolidays) {
      themeData.suggestions.callouts.push({
        type: 'upcoming_holiday',
        message: `${holiday.name} ${holiday.daysAway === 1 ? 'tomorrow' : `in ${holiday.daysAway} days`}`,
        priority: 5
      });
    }
    
    // Sort callouts by priority
    themeData.suggestions.callouts.sort((a, b) => b.priority - a.priority);
    
    // Cache the result
    eventCache.set(cacheKey, themeData);
    
    res.json(themeData);
  } catch (error) {
    console.error('Event theme detection error:', error);
    res.status(500).json({ 
      error: 'Failed to detect event theme',
      details: error.message 
    });
  }
});

// Get upcoming events summary
router.get('/upcoming', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const calendarEvents = await getCalendarEvents();
    const context = detectEventContext(new Date(), calendarEvents);
    
    const upcoming = {
      holidays: context.upcomingHolidays.slice(0, 5),
      birthdays: context.birthdays,
      familyEvents: context.familyEvents,
      totalEvents: context.upcomingHolidays.length + context.birthdays.length + context.familyEvents.length
    };
    
    res.json(upcoming);
  } catch (error) {
    console.error('Upcoming events error:', error);
    res.status(500).json({ 
      error: 'Failed to get upcoming events',
      details: error.message 
    });
  }
});

// Force cache refresh
router.post('/refresh', (req, res) => {
  try {
    eventCache.flushAll();
    console.log('Event cache cleared');
    res.json({ message: 'Event cache refreshed' });
  } catch (error) {
    console.error('Cache refresh error:', error);
    res.status(500).json({ 
      error: 'Failed to refresh cache',
      details: error.message 
    });
  }
});

export default router;