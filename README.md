# Mission Control 🚀

Family household management dashboard with smart home integration. Built with React (Vite) and AWS Amplify Gen2.

## 🏠 What is Mission Control?

Mission Control is a comprehensive family dashboard that combines task management with smart home integration:

### Core Features
- **🏠 Smart Home Dashboard**: Home Assistant widgets, weather, calendar integration
- **✅ Chore Management**: Assign tasks, track completion, approve and pay for chores
- **🍽️ Meal Planning**: Weekly meal planning with recipe database (~200 meals)
- **🛒 Shopping Lists**: Shared family shopping list with cost estimates
- **💰 Earnings Tracking**: Children's earnings from completed paid chores
- **📅 Calendar Integration**: iCloud CalDAV integration with family calendars
- **📝 Todo Integration**: Todoist integration for task management

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite 5, React Router DOM, Tailwind CSS, Radix UI
- **Backend**: Express 4 (integration server), AWS Amplify Gen2
- **Database**: DynamoDB via AppSync GraphQL
- **Integrations**: Home Assistant API, iCloud CalDAV, Todoist CLI, wttr.in weather
- **Auth**: Cookie-based auth with hardcoded passwords (private family app)
- **Deployment**: AWS Amplify Hosting

> **Note**: Uses Vite + React Router DOM, not Next.js as mentioned in older documentation.

## 🚀 Development Setup

### Prerequisites

- **Node.js 18+**
- **AWS CLI** configured with credentials
- **AWS Amplify CLI** (`npm install -g @aws-amplify/cli`)
- **Home Assistant** (optional, for smart home features)
- **iCloud account** (optional, for calendar integration)
- **Todoist account** (optional, for todo integration)

### Environment Variables

Create `.env` file in the project root:

```bash
# Server configuration
PORT=3001
NODE_ENV=development

# Home Assistant integration (optional)
HA_BASE_URL=http://localhost:8123
HA_TOKEN=your_home_assistant_long_lived_token

# iCloud CalDAV integration (optional)
CALDAV_USER=your_icloud_username@me.com
CALDAV_PASSWORD=your_icloud_app_specific_password

# AWS configuration (handled by AWS CLI)
AWS_REGION=eu-west-2
# AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY set by AWS CLI profile

# Frontend environment (create .env.local in root)
VITE_API_URL=http://localhost:3001
```

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd mission-control
   npm install
   ```

2. **Start Amplify sandbox** (creates local AWS resources):
   ```bash
   npx ampx sandbox
   ```
   This generates `amplify_outputs.json` with local DynamoDB and AppSync endpoints.

3. **Seed initial data** (users, chores, meals):
   ```bash
   node scripts/seed-data.js
   ```

4. **Start both frontend and backend:**
   ```bash
   npm run dev
   ```
   This starts:
   - Express server on http://localhost:3001 (API)
   - Vite dev server on http://localhost:3002 (Frontend)

5. **Open http://localhost:3002** and log in with family credentials.

### Alternative Development Commands

```bash
npm run client       # Start Vite dev server only (port 3002)
npm run server       # Start Express server only (port 3001)
npm run server:dev   # Start Express server with nodemon (auto-reload)
npm run build        # Production build (outputs to dist/)
npm run preview      # Preview production build
npm run start        # Serve production build on port 3002
```

### Login Credentials

| User   | Password    | Role   | Description |
|--------|-------------|--------|-------------|
| rob    | family123   | parent | Full access to all features |
| aimee  | family123   | parent | Full access to all features |
| dexter | dexter1     | child  | Limited to assigned chores and earnings |
| logan  | logan1      | child  | Limited to assigned chores and earnings |

## 🏗️ Project Structure

```
amplify/                        # AWS Amplify Gen2 backend (TypeScript)
├── backend.ts                  # Backend configuration and resource definitions
└── data/resource.ts            # DynamoDB schema and GraphQL API definition

server/                         # Express.js integration server (JavaScript ES modules)
├── index.js                    # Express server entry point
├── routes/
│   ├── homeAssistant.js        # Home Assistant API proxy routes
│   ├── calendar.js             # iCloud CalDAV integration routes
│   └── todo.js                 # Todoist CLI integration routes
└── middleware/                 # Express middleware (CORS, caching, etc.)

src/                            # React frontend (JavaScript/JSX)
├── components/
│   ├── Layout.jsx              # Main layout with navigation
│   ├── LoginScreen.jsx         # Authentication component
│   ├── widgets/                # Dashboard widgets (weather, calendar, HA)
│   └── ui.jsx                  # Radix UI component library
├── context/
│   └── UserContext.jsx         # Authentication state management
├── lib/
│   ├── amplify.js              # Amplify Data client configuration
│   ├── homeAssistant.js        # Home Assistant API client
│   └── meals.js                # Meal planning logic
├── pages/                      # Page components
│   ├── Homepage.jsx            # Smart home dashboard
│   ├── ChoresPage.jsx          # Chore management
│   ├── MealPlannerPage.jsx     # Weekly meal planning
│   ├── RecipeManagerPage.jsx   # Recipe database management
│   ├── ShoppingListPage.jsx    # Shopping list management
│   └── CalendarPage.jsx        # Calendar view
└── styles/                     # Tailwind CSS configuration

db/                             # Static meal database
├── meals.json                  # ~200 pre-configured meals
└── categories.json             # Meal categories and types

scripts/                        # Utility scripts
├── seed-data.js               # Database seeding script (idempotent)
└── meal-import.js             # Meal database import utility

public/                        # Static assets
├── manifest.json              # PWA manifest
└── icons/                     # Application icons
```

## 📊 Data Models (DynamoDB)

### Core Models

**User**
- `username` (String, Primary Key) - Unique identifier
- `displayName` (String) - Display name in UI
- `role` (String) - "parent" or "child"
- `avatar` (String) - Avatar image URL or identifier
- `earnings` (Number) - Total earnings for child users

**Chore**
- `id` (String, Primary Key) - Unique identifier
- `title` (String) - Chore description
- `assignedTo` (String) - Username of assigned family member
- `paid` (Boolean) - Whether this chore earns money
- `amount` (Number) - Payment amount in pence
- `done` (Boolean) - Completion status
- `approved` (Boolean) - Parent approval status
- `recurring` (Boolean) - Whether chore repeats
- `category` (String) - Chore category for organization
- `createdAt` (DateTime) - Creation timestamp
- `completedAt` (DateTime) - Completion timestamp

**ChoreTemplate**
- `id` (String, Primary Key) - Template identifier
- `title` (String) - Default chore title
- `defaultAmount` (Number) - Default payment amount
- `category` (String) - Chore category
- `estimatedMinutes` (Number) - Time estimate

**ChoreCompletion**
- `id` (String, Primary Key) - Completion record ID
- `choreId` (String) - Reference to completed chore
- `completedBy` (String) - Username who completed
- `completedAt` (DateTime) - Completion timestamp
- `amountEarned` (Number) - Amount earned

### Meal Planning Models

**Meal**
- `id` (String, Primary Key) - Unique identifier  
- `date` (String) - Date in YYYY-MM-DD format
- `mealType` (String) - "breakfast", "lunch", "dinner"
- `meal` (String) - Meal name/description
- `mealId` (String) - Reference to recipe database
- `plannedBy` (String) - Username who planned the meal
- `createdAt` (DateTime) - Planning timestamp

**MealRecipe** 
- `id` (String, Primary Key) - Recipe identifier
- `name` (String) - Recipe name
- `description` (String) - Recipe description
- `ingredients` (Array) - List of ingredients
- `instructions` (Array) - Cooking instructions
- `category` (String) - Recipe category
- `tags` (Array) - Recipe tags for filtering
- `prepTime` (Number) - Preparation time in minutes
- `cookTime` (Number) - Cooking time in minutes
- `servings` (Number) - Number of servings

### Shopping & Household

**ShoppingItem**
- `id` (String, Primary Key) - Item identifier
- `name` (String) - Item name
- `quantity` (String) - Quantity description
- `estimatedCost` (Number) - Estimated cost in pence
- `addedBy` (String) - Username who added item
- `checked` (Boolean) - Purchase completion status
- `category` (String) - Shopping category
- `priority` (Number) - Priority level (1-5)
- `addedAt` (DateTime) - Addition timestamp

## 🔌 Integrations

### Home Assistant Integration

Provides smart home dashboard widgets:

**Configuration:**
- Set `HA_BASE_URL` and `HA_TOKEN` in environment
- Home Assistant must be accessible from the server
- Long-lived access token required

**Features:**
- Device status widgets (lights, sensors, switches)
- Climate control interface  
- Security system status
- Energy monitoring displays

**API Endpoints:**
- `GET /api/ha/entities` - List all entities
- `GET /api/ha/entity/:entity_id` - Get entity state
- `POST /api/ha/service` - Call Home Assistant service

### Calendar Integration (iCloud CalDAV)

Syncs family calendars using CalDAV protocol:

**Configuration:**
- Set `CALDAV_USER` and `CALDAV_PASSWORD` in environment
- Uses iCloud app-specific password (not main iCloud password)
- Supports multiple calendar subscriptions

**Features:**
- Family calendar events display
- Individual children's calendars
- Today and upcoming events widgets
- Event creation and editing (future feature)

**Calendar IDs** (from TOOLS.md):
- Home: `845FE01D-0989-4958-86CD-3EBFC8AA1791`
- Family: `ddfd4cdf-a431-42f6-a655-66030520305d`
- Logan: `2AE072B1-10CA-43B0-A428-7233BD85D7B6`
- Dexter: `7CF59B9D-242F-4920-A009-424CF14571B6`

### Todoist Integration

Task management through Todoist CLI:

**Configuration:**
- Requires `todoist` CLI tool installed
- Authentication handled by CLI tool setup
- Cached responses (15-minute TTL)

**Features:**
- Personal todo list display
- Task completion tracking
- Project filtering
- Quick task addition

## 🌐 API Architecture

### Express Server (Port 3001)

The Express server acts as an integration layer between the React frontend and external services:

**Route Structure:**
- `/api/ha/*` - Home Assistant proxy routes
- `/api/calendar/*` - CalDAV calendar integration  
- `/api/todo/*` - Todoist CLI integration
- `/api/weather` - Weather information (wttr.in)

**Caching Strategy:**
- NodeCache with 15-minute TTL for external API calls
- Reduces API rate limiting and improves performance
- Cache invalidation on data mutations

**CORS Configuration:**
- Allows requests from Vite dev server (3002) and production domains
- Handles preflight requests for cross-origin API calls

### Frontend API Calls (Port 3002)

React components consume APIs through:
- **Amplify Data Client** - Direct DynamoDB operations (chores, meals, shopping)
- **Express API Proxy** - External integrations (HA, CalDAV, Todoist)
- **Environment Variables** - `VITE_API_URL` configures API base URL

## 🚀 Deployment

### Production Deployment (AWS Amplify Hosting)

**Prerequisites:**
- AWS account with Amplify access
- Repository connected to Amplify Console
- Environment variables configured in Amplify Console

**Deployment Steps:**

1. **Connect repository** to AWS Amplify Console
2. **Configure build settings** (automatic detection of Vite app)
3. **Set environment variables** in Amplify Console:
   ```
   HA_BASE_URL=http://your-home-assistant-url:8123
   HA_TOKEN=your_long_lived_token
   CALDAV_USER=your_icloud_user@me.com  
   CALDAV_PASSWORD=your_app_specific_password
   VITE_API_URL=https://your-amplify-app.amplifyapp.com
   NODE_VERSION=18
   ```

4. **Deploy** - Amplify automatically:
   - Builds the Amplify Gen2 backend (DynamoDB + AppSync)
   - Installs dependencies and builds the React app
   - Deploys both backend and frontend
   - Configures custom domains if specified

5. **Post-deployment setup:**
   ```bash
   # Seed production database with initial data
   node scripts/seed-data.js --env production
   ```

### Local Production Testing

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Serve production build (port 3002)  
npm run start
```

### Environment-Specific Configuration

**Development:**
- Amplify sandbox for local AWS resources
- Mock data fallbacks when integrations unavailable
- Hot reload and detailed error logging

**Production:**
- Full AWS Amplify deployment
- External service integrations required
- Optimized build with minification
- Error boundary components with fallback UI

## 🧪 Testing Strategy

### Manual Testing Checklist

**Authentication:**
- [ ] Login/logout functionality
- [ ] Role-based access control (parent vs child)
- [ ] Session persistence

**Chore Management:**
- [ ] Create, edit, delete chores
- [ ] Assign chores to family members  
- [ ] Mark chores complete
- [ ] Parent approval workflow
- [ ] Earnings calculation and tracking

**Meal Planning:**
- [ ] Weekly meal planning interface
- [ ] Recipe database search and selection
- [ ] Meal suggestions based on history
- [ ] Shopping list generation from meals

**Smart Home Integration:**
- [ ] Home Assistant widget display
- [ ] Device control functionality
- [ ] Calendar event display
- [ ] Weather information accuracy

### Data Validation

**Chore Data:**
- Payment amounts stored in pence (integer)
- Completion timestamps accurate
- User assignments valid

**Meal Data:**
- Date formats consistent (YYYY-MM-DD)
- Recipe references valid
- Ingredient lists well-formed

## 🔧 Troubleshooting

### Common Issues

**Amplify Sandbox Issues:**
```bash
# Reset Amplify sandbox if corrupted
npx ampx sandbox delete
npx ampx sandbox  

# Clear node_modules if dependencies broken
rm -rf node_modules package-lock.json
npm install
```

**Home Assistant Connection:**
- Verify `HA_BASE_URL` and `HA_TOKEN` in environment
- Check Home Assistant network accessibility
- Confirm long-lived token permissions

**Calendar Integration:**
- Verify iCloud app-specific password (not main password)
- Check CalDAV server accessibility
- Confirm calendar IDs are correct

**Database Issues:**
```bash
# Re-seed database if data corrupted
node scripts/seed-data.js --force

# Check Amplify backend logs
npx ampx sandbox logs
```

### Performance Optimization

**Caching:**
- Server-side caching for external APIs (15 min TTL)
- Frontend caching for static meal database
- Browser caching for assets and icons

**Database:**
- Efficient queries with proper indexes
- Batch operations for bulk updates
- Pagination for large data sets (future feature)

**Network:**
- API route optimization
- Reduced payload sizes
- Proper HTTP status codes

## 🤝 Contributing

### Development Workflow

1. **Create feature branch** from `master`
2. **Local development** with `npm run dev`  
3. **Test thoroughly** with all user roles
4. **Update documentation** if needed
5. **Submit pull request** with description

### Code Standards

- **ES Modules** throughout (no CommonJS)
- **Functional components** with React Hooks
- **Tailwind CSS** for styling consistency  
- **JSDoc comments** for complex functions
- **Error boundaries** for robust error handling
- **Environment variable** validation

### Git Workflow

- **Main branch:** `master`
- **Feature branches:** `feature/<name>` or `fix/<name>`
- **Remote:** `origin` (github-personal:NilSkilz/mission-control)

## 📚 Additional Documentation

- **[CLAUDE.md](CLAUDE.md)**: Comprehensive technical documentation for AI assistants
- **Architecture decisions**: Document significant technical choices
- **API documentation**: Detailed endpoint specifications (future)
- **User manual**: End-user documentation (future)

## 📄 License

Private family application - not licensed for public use.

## 🆘 Support

- **Technical Issues**: Check CLAUDE.md for detailed implementation notes
- **Integration Problems**: Verify environment variable configuration
- **Data Issues**: Use seed scripts to reset database state
- **Performance**: Monitor server logs and enable debug logging

---

**Note**: Mission Control is designed as a private family application with hardcoded authentication. It prioritizes functionality and ease of use over enterprise security features.
