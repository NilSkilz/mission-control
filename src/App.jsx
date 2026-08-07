import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './context/UserContext'
import { TideThemeProvider } from './tide/TideThemeProvider'
import TideShell from './tide/TideShell'
import TideHome from './tide/TideHome'
import TideNotes from './tide/TideNotes'
import TideCinema from './tide/TideCinema'
import TideHouse from './tide/TideHouse'
import TideLifts from './tide/TideLifts'
import TideJarvis from './tide/TideJarvis'
import TidePeople from './tide/TidePeople'
import TideHealth from './tide/TideHealth'
import TideJournal from './tide/TideJournal'
import TideSystem from './tide/TideSystem'
import SystemFrame from './tide/SystemFrame'
import LoginScreen from './components/LoginScreen'

// Family screens (Tide)
import ChoresPage from './pages/Chores'
import MealsPage from './pages/Meals'
import MealsManagerPage from './pages/MealsManager'
import ShoppingPage from './pages/Shopping'
import CalendarPage from './pages/Calendar'

// Legacy sci-fi / system screens (kept unchanged, moved under /system)
import SimpleDemo from './pages/SimpleDemo'
import AgentsPage from './pages/Agents'
import SystemAdminPage from './pages/SystemAdmin'
import DocumentsPage from './pages/Documents'
import TimelinePage from './pages/Timeline'
import VideosPage from './pages/Videos'
import OrbitalDemo from './pages/OrbitalDemo'
import SeasonalDemo from './pages/SeasonalDemo'

function Loading() {
  return (
    <div className="tide-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="tide-glow" />
      <div className="tide-content tide-grad" style={{ fontWeight: 800, fontSize: 20 }}>
        tide…
      </div>
    </div>
  )
}

function ProtectedRoute({ children, requireParent = false }) {
  const { user, loading } = useUser()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (requireParent && user.role !== 'parent') return <Navigate to="/" replace />
  return children
}

// A family screen inside the Tide shell, behind auth.
function Family({ children, requireParent = false }) {
  return (
    <ProtectedRoute requireParent={requireParent}>
      <TideShell>{children}</TideShell>
    </ProtectedRoute>
  )
}

// A legacy system screen, parent-only, wrapped in the slim system bar.
function System({ children }) {
  return (
    <ProtectedRoute requireParent>
      <SystemFrame>{children}</SystemFrame>
    </ProtectedRoute>
  )
}

function AppRoutes() {
  const { user, loading } = useUser()
  if (loading) return <Loading />

  return (
    <Routes>
      {/* auth */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginScreen />} />

      {/* family (Tide) */}
      <Route path="/" element={<Family><TideHome /></Family>} />
      <Route path="/chores" element={<Family><ChoresPage /></Family>} />
      <Route path="/calendar" element={<Family><CalendarPage /></Family>} />
      <Route path="/meals" element={<Family><MealsPage /></Family>} />
      <Route path="/meals/manage" element={<Family requireParent><MealsManagerPage /></Family>} />
      <Route path="/shopping" element={<Family><ShoppingPage /></Family>} />
      <Route path="/notes" element={<Family><TideNotes /></Family>} />
      <Route path="/cinema" element={<Family><TideCinema /></Family>} />
      <Route path="/house" element={<Family><TideHouse /></Family>} />
      <Route path="/lifts" element={<Family><TideLifts /></Family>} />
      <Route path="/jarvis" element={<Family><TideJarvis /></Family>} />
      <Route path="/people" element={<Family requireParent><TidePeople /></Family>} />
      <Route path="/health" element={<Family requireParent><TideHealth /></Family>} />
      <Route path="/journal" element={<Family requireParent><TideJournal /></Family>} />

      {/* system — Tide-styled launcher (all users; services list is role-scoped server-side). Legacy dashboards under it stay parent-only. */}
      <Route path="/system" element={<Family><TideSystem /></Family>} />
      <Route path="/system/dashboard" element={<System><SimpleDemo /></System>} />
      <Route path="/system/agents" element={<System><AgentsPage /></System>} />
      <Route path="/system/admin" element={<System><SystemAdminPage /></System>} />
      <Route path="/system/documents" element={<System><DocumentsPage /></System>} />
      <Route path="/system/timeline" element={<System><TimelinePage /></System>} />
      <Route path="/system/videos" element={<System><VideosPage /></System>} />
      <Route path="/system/orbital" element={<System><OrbitalDemo /></System>} />
      <Route path="/system/seasonal" element={<System><SeasonalDemo /></System>} />

      {/* legacy redirects */}
      <Route path="/family" element={<Navigate to="/" replace />} />
      <Route path="/family/login" element={<Navigate to="/login" replace />} />
      <Route path="/family/chores" element={<Navigate to="/chores" replace />} />
      <Route path="/family/meals" element={<Navigate to="/meals" replace />} />
      <Route path="/family/shopping" element={<Navigate to="/shopping" replace />} />
      <Route path="/family/calendar" element={<Navigate to="/calendar" replace />} />
      <Route path="/agents" element={<Navigate to="/system/agents" replace />} />
      <Route path="/admin" element={<Navigate to="/system/admin" replace />} />
      <Route path="/documents" element={<Navigate to="/system/documents" replace />} />
      <Route path="/timeline" element={<Navigate to="/system/timeline" replace />} />
      <Route path="/videos" element={<Navigate to="/system/videos" replace />} />
      <Route path="/login-legacy" element={<Navigate to="/login" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <TideThemeProvider>
          <AppRoutes />
        </TideThemeProvider>
      </UserProvider>
    </BrowserRouter>
  )
}
