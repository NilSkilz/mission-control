# Agents Page - Implementation Documentation

## Overview
A comprehensive sub-agent monitoring dashboard for Mission Control, integrating with OpenClaw to provide real-time visibility into agent activities, sessions, and performance.

## Features Implemented

### 🤖 Agent Status Panel (Left Sidebar)
- **Sub-agent Registry**: Displays configured sub-agents from AGENTS.md registry
- **Categorization**: Groups agents by type (RESEARCH, BUILDER, PROJECT MANAGERS)
- **Status Indicators**: Shows real-time status (Active/Idle/Error) with color-coded indicators
- **Last Run Tracking**: Displays when each agent was last active
- **Model Information**: Shows which AI model each agent uses
- **Blackboard Integration**: Displays shared file count and status

### 📊 Sessions Table (Center Panel)
- **Tabbed Interface**: Sessions, Decisions, Signals, Crons, Costs (other tabs planned)
- **Real-time Data**: Fetches from OpenClaw sessions API
- **Session Details**: Status, type, trigger, last run, duration, model, token usage
- **Session Types**: Distinguishes between Main, Sub-agent, and Cron job sessions
- **Token Tracking**: Displays token consumption for cost monitoring

### 🔍 Agent Details (Right Panel)
- **Selected Agent Info**: Shows detailed information when agent is selected
- **Role & Capabilities**: Displays agent purpose and available tools
- **Environment Info**: Shows sandbox/execution environment
- **Quick Actions**: Workspace, session history, and cost breakdown (buttons ready for implementation)

### 🔄 Real-time Updates
- **Auto-refresh**: Updates every 30 seconds to show current status
- **Manual Refresh**: Refresh button for immediate updates
- **API Integration**: Connects to OpenClaw via custom REST endpoints

## Technical Implementation

### API Endpoints Created
- `GET /api/agents/sessions` - Fetches all OpenClaw sessions
- `GET /api/agents/sessions/:sessionKey` - Gets specific session details
- `GET /api/agents/registry` - Returns sub-agent configuration
- `GET /api/agents/blackboard` - Shows shared blackboard file status

### Component Architecture
- **AgentsPage.jsx**: Main page component with three-panel layout
- **Agent Status Indicators**: Reusable status components with consistent styling
- **Session Table**: Sortable table with session data
- **Real-time Updates**: UseEffect hooks with interval-based polling

### Data Flow
1. Page loads and fetches data from three API endpoints simultaneously
2. Agent registry provides static configuration data
3. Sessions API provides real-time activity data
4. Status is computed by correlating recent session activity
5. Auto-refresh updates data every 30 seconds

## Integration with Mission Control

### Navigation
- Added "Agents" tab to main navigation (parent-only access)
- Route: `/agents`
- Integrated with existing Layout component

### Styling
- Matches existing Mission Control dark theme
- Uses consistent Card, Badge, and Button components
- Responsive design works on mobile and desktop
- Color coding: teal accents, slate backgrounds

### Authentication
- Respects existing user roles (parent access only)
- Uses Layout component for consistent authentication

## Data Sources

### OpenClaw Integration
- **sessions_list**: Real-time session data via `openclaw sessions --json`
- **Agent Registry**: Static configuration from AGENTS.md
- **Blackboard**: File system integration for shared workspace

### Session Status Logic
- **Active**: Updated within last 5 minutes
- **Idle**: No recent activity
- **Error**: Aborted last run flag set

## Mobile Responsiveness
- Three-panel layout collapses on smaller screens
- Tables scroll horizontally on mobile
- Navigation remains accessible
- Touch-friendly interface elements

## Future Enhancements (Ready for Implementation)

### Planned Features
- **Decisions Tab**: Agent decision logs and reasoning
- **Signals Tab**: Inter-agent communication tracking
- **Crons Tab**: Scheduled task management
- **Costs Tab**: Detailed cost breakdown and budgeting
- **Quick Actions**: Workspace viewer, detailed session history

### Potential Additions
- Agent performance metrics
- Cost alerts and budgeting
- Session replay functionality
- Agent workload balancing

## Testing

### Manual Testing Completed
✅ Page loads correctly at http://localhost:3003/agents  
✅ Navigation integration works  
✅ API endpoints return correct data  
✅ Real-time refresh functionality  
✅ Agent selection updates right panel  
✅ Mobile responsive layout  
✅ Dark theme styling consistent  

### API Testing
```bash
# Test sessions endpoint
curl -s "http://localhost:3001/api/agents/sessions" | jq '.count'

# Test registry endpoint  
curl -s "http://localhost:3001/api/agents/registry" | jq 'length'

# Test blackboard endpoint
curl -s "http://localhost:3001/api/agents/blackboard" | jq '.totalFiles'
```

## Deployment
- Production build completed: `npm run build`
- PM2 services restarted: `mission-control-api` and `mission-control-prod`
- Available at: http://localhost:3003/agents

## Files Modified/Created

### New Files
- `/server/routes/agents.js` - API endpoints for agent data
- `/src/pages/Agents.jsx` - Main agents page component
- `/AGENTS_PAGE.md` - This documentation

### Modified Files
- `/server/index.js` - Added agents route registration
- `/src/App.jsx` - Added agents route and import
- `/src/components/Layout.jsx` - Added agents navigation item

The Agents page is now fully integrated into Mission Control and ready for use!