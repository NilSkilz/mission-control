/**
 * Server-side Event Detection System for Mission Control
 * Detects seasons, holidays, birthdays, and special events
 * (Duplicate of frontend lib for server-side use)
 */

// Season definitions (Northern Hemisphere)
const SEASONS = {
  SPRING: { start: [3, 20], end: [6, 21], name: 'spring' },
  SUMMER: { start: [6, 21], end: [9, 22], name: 'summer' },
  AUTUMN: { start: [9, 22], end: [12, 21], name: 'autumn' },
  WINTER: { start: [12, 21], end: [3, 20], name: 'winter' }
}

// Holiday definitions (UK focused + universal)
const HOLIDAYS = [
  // Fixed date holidays
  { name: 'New Year\'s Day', date: [1, 1], type: 'celebration' },
  { name: 'Valentine\'s Day', date: [2, 14], type: 'romance' },
  { name: 'St. Patrick\'s Day', date: [3, 17], type: 'celebration' },
  { name: 'Halloween', date: [10, 31], type: 'spooky' },
  { name: 'Guy Fawkes Night', date: [11, 5], type: 'celebration' },
  { name: 'Christmas Eve', date: [12, 24], type: 'christmas' },
  { name: 'Christmas Day', date: [12, 25], type: 'christmas' },
  { name: 'Boxing Day', date: [12, 26], type: 'christmas' },
  { name: 'New Year\'s Eve', date: [12, 31], type: 'celebration' },
  
  // Variable date holidays (calculated)
  { name: 'Easter Sunday', type: 'easter', holiday: 'easter' },
  { name: 'Good Friday', type: 'easter', holiday: 'good_friday' },
  { name: 'Easter Monday', type: 'easter', holiday: 'easter_monday' },
  { name: 'Mother\'s Day', type: 'family', holiday: 'mothers_day_uk' },
  { name: 'Father\'s Day', type: 'family', holiday: 'fathers_day_uk' },
  
  // Month-long events
  { name: 'December Festivities', month: 12, type: 'christmas_season' },
  { name: 'Spooky Season', month: 10, type: 'spooky_season' }
]

// Helper function to calculate Easter Sunday
function getEasterSunday(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const n = Math.floor((h + l - 7 * m + 114) / 31)
  const p = (h + l - 7 * m + 114) % 31
  
  return new Date(year, n - 1, p + 1)
}

// Helper function to get variable holiday dates
function getVariableHoliday(holiday, year) {
  const easter = getEasterSunday(year)
  
  switch (holiday) {
    case 'easter':
      return easter
    case 'good_friday':
      const goodFriday = new Date(easter)
      goodFriday.setDate(easter.getDate() - 2)
      return goodFriday
    case 'easter_monday':
      const easterMonday = new Date(easter)
      easterMonday.setDate(easter.getDate() + 1)
      return easterMonday
    case 'mothers_day_uk':
      // 4th Sunday of Lent (3 weeks before Easter)
      const mothersDay = new Date(easter)
      mothersDay.setDate(easter.getDate() - 21)
      return mothersDay
    case 'fathers_day_uk':
      // 3rd Sunday of June
      const fathersDay = new Date(year, 5, 1) // June 1st
      fathersDay.setDate(1 + (7 - fathersDay.getDay()) + 14) // 3rd Sunday
      return fathersDay
    default:
      return null
  }
}

// Get current season
export function getCurrentSeason(date = new Date()) {
  const month = date.getMonth() + 1
  const day = date.getDate()
  
  for (const season of Object.values(SEASONS)) {
    const [startMonth, startDay] = season.start
    const [endMonth, endDay] = season.end
    
    if (season.name === 'winter') {
      // Winter spans across year boundary
      if ((month === startMonth && day >= startDay) || 
          (month === 1 || month === 2) || 
          (month === endMonth && day < endDay)) {
        return season
      }
    } else {
      if ((month === startMonth && day >= startDay) || 
          (month > startMonth && month < endMonth) || 
          (month === endMonth && day < endDay)) {
        return season
      }
    }
  }
  
  return SEASONS.SPRING // Fallback
}

// Get active holidays for a given date
export function getActiveHolidays(date = new Date()) {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const year = date.getFullYear()
  
  const activeHolidays = []
  
  for (const holiday of HOLIDAYS) {
    if (holiday.date) {
      // Fixed date holiday
      const [hMonth, hDay] = holiday.date
      if (month === hMonth && day === hDay) {
        activeHolidays.push(holiday)
      }
    } else if (holiday.holiday) {
      // Variable date holiday
      const holidayDate = getVariableHoliday(holiday.holiday, year)
      if (holidayDate && 
          holidayDate.getMonth() + 1 === month && 
          holidayDate.getDate() === day) {
        activeHolidays.push(holiday)
      }
    } else if (holiday.month) {
      // Month-long event
      if (month === holiday.month) {
        activeHolidays.push(holiday)
      }
    }
  }
  
  return activeHolidays
}

// Get upcoming holidays within a range
export function getUpcomingHolidays(days = 7, date = new Date()) {
  const upcoming = []
  const startDate = new Date(date)
  
  for (let i = 0; i <= days; i++) {
    const checkDate = new Date(startDate)
    checkDate.setDate(startDate.getDate() + i)
    
    const holidays = getActiveHolidays(checkDate)
    for (const holiday of holidays) {
      if (!upcoming.find(h => h.name === holiday.name)) {
        upcoming.push({
          ...holiday,
          date: new Date(checkDate),
          daysAway: i
        })
      }
    }
  }
  
  return upcoming.sort((a, b) => a.daysAway - b.daysAway)
}

// Detect if we're in a special period (e.g., Christmas season, spooky season)
export function getSpecialPeriod(date = new Date()) {
  const month = date.getMonth() + 1
  const day = date.getDate()
  
  // Christmas season (December)
  if (month === 12) {
    if (day >= 1 && day <= 23) return { name: 'christmas_countdown', type: 'christmas_season' }
    if (day >= 24 && day <= 31) return { name: 'christmas_week', type: 'christmas' }
  }
  
  // Spooky season (October)
  if (month === 10) {
    if (day >= 1 && day <= 30) return { name: 'spooky_season', type: 'spooky' }
    if (day === 31) return { name: 'halloween', type: 'spooky' }
  }
  
  // Valentine's period (February 1-14)
  if (month === 2 && day >= 1 && day <= 14) {
    return { name: 'valentine_season', type: 'romance' }
  }
  
  // New Year period (late December / early January)
  if ((month === 12 && day >= 29) || (month === 1 && day <= 3)) {
    return { name: 'new_year', type: 'celebration' }
  }
  
  return null
}

// Check if date is close to a birthday based on calendar events
export function getBirthdayEvents(calendarEvents) {
  if (!calendarEvents) return []
  
  const today = new Date()
  const birthdays = []
  
  for (const event of calendarEvents) {
    const title = event.title.toLowerCase()
    
    // Look for birthday indicators
    if (title.includes('birthday') || 
        title.includes('bday') || 
        title.includes(' born') ||
        title.match(/\b\d+th\b/) || // "10th birthday"
        title.match(/turns \d+/) || // "John turns 25"
        title.includes('🎂')) {
      
      const eventDate = new Date(event.start)
      const daysAway = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24))
      
      if (daysAway >= 0 && daysAway <= 7) {
        birthdays.push({
          name: event.title,
          date: eventDate,
          daysAway: daysAway,
          type: 'birthday'
        })
      }
    }
  }
  
  return birthdays
}

// Get family events from calendar
export function getFamilyEvents(calendarEvents) {
  if (!calendarEvents) return []
  
  const today = new Date()
  const familyEvents = []
  
  for (const event of calendarEvents) {
    const title = event.title.toLowerCase()
    const eventDate = new Date(event.start)
    const daysAway = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24))
    
    // Look for family event indicators
    if (daysAway >= 0 && daysAway <= 7 && (
        title.includes('family') ||
        title.includes('anniversary') ||
        title.includes('reunion') ||
        title.includes('gathering') ||
        title.includes('dinner') ||
        title.includes('visit') ||
        title.includes('holiday') ||
        title.includes('celebration')
    )) {
      familyEvents.push({
        name: event.title,
        date: eventDate,
        daysAway: daysAway,
        type: 'family'
      })
    }
  }
  
  return familyEvents
}

// Main context detection function
export function detectEventContext(date = new Date(), calendarEvents = null) {
  const season = getCurrentSeason(date)
  const holidays = getActiveHolidays(date)
  const upcoming = getUpcomingHolidays(7, date)
  const specialPeriod = getSpecialPeriod(date)
  const birthdays = getBirthdayEvents(calendarEvents)
  const familyEvents = getFamilyEvents(calendarEvents)
  
  return {
    season: season.name,
    holidays,
    upcomingHolidays: upcoming,
    specialPeriod,
    birthdays,
    familyEvents,
    timestamp: date.toISOString()
  }
}