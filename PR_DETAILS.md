# Calendar & Todo Integration for Mission Control

## Features Added
- CalDAV integration with iCloud calendar
- Todoist task fetching for shared project
- Caching mechanism for calendar and todo endpoints
- Frontend widgets for displaying events and tasks
- Error handling for API calls

## Backend Endpoints
- `/api/calendar/events`: Fetches calendar events for the next 7 days
- `/api/todo/tasks`: Retrieves tasks from the shared Todoist project

## Frontend Components
- `CalendarWidget`: Displays upcoming events
- `TodoWidget`: Shows today's tasks with priority indicators

## Configuration
- Added `.env` support for storing sensitive credentials
- Configured CORS for local development
- Implemented caching to reduce external API calls

## Next Steps
- Add authentication
- Implement more robust error handling
- Add configuration for multiple calendars/projects