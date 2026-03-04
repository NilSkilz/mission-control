# PR: Add Agents Monitoring Dashboard to Mission Control

## Summary
Implements a comprehensive sub-agent monitoring dashboard that integrates with OpenClaw to provide real-time visibility into agent activities, sessions, and performance metrics.

## What's New
- **New route**: `/agents` - Agent monitoring dashboard (parent access only)
- **API integration**: Connects to OpenClaw sessions via REST endpoints
- **Real-time monitoring**: Auto-refreshes every 30s to show current agent status
- **Responsive design**: Matches Mission Control's dark theme and mobile layout

## Features Implemented

### 🤖 Agent Status Panel
- Sub-agent registry (Dev, Scout, Scribe, House from AGENTS.md)
- Real-time status indicators (Active/Idle/Error)
- Categorized by agent type (Research, Builder, Project Managers)
- Last run timestamps and model information
- Blackboard integration showing shared workspace files

### 📊 Sessions Dashboard
- Tabbed interface (Sessions active, others ready for implementation)
- Live session data from OpenClaw API
- Session details: status, type, trigger, duration, model, tokens
- Distinguishes between Main, Sub-agent, and Cron job sessions

### 🔍 Agent Details
- Selected agent information panel
- Role, capabilities, environment details
- Quick action buttons (ready for implementation)

## Technical Changes

### New Files
- `server/routes/agents.js` - API endpoints for OpenClaw integration
- `src/pages/Agents.jsx` - Main dashboard component
- `test-agents-api.js` - API testing script

### Modified Files
- `server/index.js` - Added agents route registration
- `src/App.jsx` - Added agents route and component import
- `src/components/Layout.jsx` - Added agents navigation item

### API Endpoints Added
- `GET /api/agents/sessions` - Fetches OpenClaw sessions data
- `GET /api/agents/registry` - Returns sub-agent configuration
- `GET /api/agents/blackboard` - Shows shared workspace status

## Data Integration
- **OpenClaw CLI**: Integrates via `openclaw sessions --json`
- **Session Status**: Computes agent status from recent activity
- **Real-time Updates**: Polls every 30 seconds for fresh data
- **Error Handling**: Gracefully handles API failures

## Testing
✅ Manual testing completed on http://localhost:3003/agents  
✅ All API endpoints tested and working  
✅ Mobile responsive design verified  
✅ Dark theme styling matches existing pages  
✅ Navigation integration working  
✅ Real-time refresh functionality confirmed  

## Screenshots
The dashboard shows:
- Left: Agent categories with status indicators
- Center: Sessions table with live data
- Right: Selected agent details and actions
- Top: Integrated navigation with refresh controls

## Future Work
- Implement remaining tabs (Decisions, Signals, Crons, Costs)
- Add session history drill-down
- Implement workspace viewer
- Add cost monitoring and alerts

## Dependencies
No new dependencies added - uses existing Mission Control stack:
- React + React Router for frontend
- Express.js for API endpoints
- OpenClaw CLI for data integration
- Existing UI components and styling

## Deployment Notes
- Production build completed and deployed
- PM2 services restarted with new routes
- Available immediately at `/agents` route
- Requires parent role for access (follows existing permission model)