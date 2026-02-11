# CLAUDE.md - Mission Control

## Project Overview

Family household management dashboard built with React (Vite) and AWS Amplify Gen2. Features chore tracking with earnings, weekly meal planning, shared shopping lists, and a Home Assistant-powered smart home dashboard with calendar and todo integrations.

## Tech Stack

- **Frontend:** React 18, Vite 5, Tailwind CSS 3, Radix UI components
- **Backend:** Express 4 (integration server), AWS Amplify Gen2 (DynamoDB)
- **Integrations:** Home Assistant, iCloud CalDAV (tsdav), Todoist CLI, wttr.in weather
- **Deployment:** AWS Amplify Hosting

> **Note:** The README mentions Next.js 14 but the project actually uses Vite + React Router DOM.

## Commands

```bash
npm run dev          # Start both frontend (port 3002) and backend (port 3001) concurrently
npm run client       # Start Vite dev server only
npm run server       # Start Express server only
npm run server:dev   # Start Express server with nodemon (auto-reload)
npm run build        # Production build (outputs to dist/)
npm run preview      # Preview production build
npm run start        # Serve production build on port 3002
npx ampx sandbox     # Start Amplify sandbox (local cloud resources)
node scripts/seed-data.js  # Seed initial data (users, chores, meals)
```

## Project Structure

```
amplify/              # Amplify Gen2 backend (TypeScript)
  data/resource.ts    # DynamoDB schema (User, Chore, ChoreTemplate, ChoreCompletion, Meal, MealRecipe, ShoppingItem)
server/               # Express integration server (JavaScript, ES modules)
  routes/             # API routes: homeAssistant.js, calendar.js, todo.js
src/                  # React frontend (JavaScript/JSX)
  components/         # UI components (Layout, LoginScreen, widgets, ui.jsx)
  context/            # UserContext.jsx (auth state)
  lib/                # Data clients (Amplify, HA API, meal logic)
  pages/              # Page components (Homepage, Chores, Meals, Shopping, etc.)
db/                   # Static meal database (~200 meals)
scripts/              # Seed scripts
```

## Architecture & Patterns

- **Components:** Functional components with hooks (no class components)
- **State:** React Context for auth, useState for component-level state
- **Data:** Amplify Data Client for CRUD; mock data fallback when Amplify is unavailable
- **API layer:** Express proxies external services (HA, CalDAV, Todoist) with 15-min NodeCache
- **Auth:** Hardcoded passwords in UserContext.jsx, session in localStorage (`mission-control-user`)
- **Routing:** React Router DOM with role-based route protection (parent vs child)
- **Styling:** Tailwind with dark theme (slate background, teal accents); Radix UI primitives in `src/components/ui.jsx`

## Naming Conventions

- **Components/Pages:** PascalCase (`Homepage.jsx`, `CalendarWidget.jsx`)
- **Utilities/routes:** camelCase or kebab-case (`meal-suggestions.js`, `homeAssistant.js`)
- **Variables/functions:** camelCase
- **Constants:** SCREAMING_SNAKE_CASE (`PASSWORDS`, `MOCK_USERS`)

## Environment Variables

```
PORT=3001                  # Express server port
HA_BASE_URL=http://localhost:8123  # Home Assistant URL
HA_TOKEN=                  # Home Assistant Bearer token
CALDAV_USER=               # iCloud username
CALDAV_PASSWORD=           # iCloud app-specific password
VITE_API_URL=              # Frontend API base URL (used in import.meta.env)
AWS_REGION=eu-west-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

## Key Routes (Frontend)

- `/` - Dashboard (HA widgets, calendar, todos)
- `/family/login` - Login
- `/family/chores` - Chore management (all roles)
- `/family/meals` - Meal planner (parent only)
- `/meals/manage` - Recipe book editor (parent only)
- `/family/shopping` - Shopping list (parent only)
- `/family/calendar` - Calendar view (all roles)

## Testing & Linting

No formal testing or linting setup. No Jest/Vitest, no ESLint/Prettier config.

## Git Workflow

- Branch: `master`
- Feature branches: `feature/<name>` prefix
- Remote: `origin` (github-personal:NilSkilz/mission-control)
