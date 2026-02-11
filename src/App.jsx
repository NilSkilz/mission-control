import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { UserProvider, useUser } from './context/UserContext'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import LoginScreen from './components/LoginScreen'
import Layout from './components/Layout'
import Homepage from './pages/Homepage'
import ChoresPage from './pages/Chores'
import MealsPage from './pages/Meals'
import MealsManagerPage from './pages/MealsManager'
import ShoppingPage from './pages/Shopping'
import CalendarPage from './pages/Calendar'

function BackToHome({ children }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}

function ProtectedRoute({ children, requireParent = false }) {
  const { user, loading } = useUser()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-teal-400 text-xl">Loading...</div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/family/login" replace />
  }
  
  if (requireParent && user.role !== 'parent') {
    return <Navigate to="/family/chores" replace />
  }
  
  return children
}

function AppRoutes() {
  const { user, loading } = useUser()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-teal-400 text-xl">Loading...</div>
      </div>
    )
  }
  
  return (
    <Routes>
      {/* Public homepage - no auth required */}
      <Route path="/" element={<Homepage />} />
      
      {/* Family app routes - auth required */}
      <Route path="/family/login" element={user ? <Navigate to="/family/chores" replace /> : <LoginScreen />} />
      <Route path="/family/chores" element={
        <ProtectedRoute>
          <BackToHome>
            <ChoresPage />
          </BackToHome>
        </ProtectedRoute>
      } />
      <Route path="/family/meals" element={
        <ProtectedRoute requireParent>
          <BackToHome>
            <MealsPage />
          </BackToHome>
        </ProtectedRoute>
      } />
      <Route path="/meals/manage" element={
        <ProtectedRoute requireParent>
          <BackToHome>
            <MealsManagerPage />
          </BackToHome>
        </ProtectedRoute>
      } />
      <Route path="/family/shopping" element={
        <ProtectedRoute requireParent>
          <BackToHome>
            <ShoppingPage />
          </BackToHome>
        </ProtectedRoute>
      } />
      <Route path="/family/calendar" element={
        <ProtectedRoute>
          <Layout>
            <CalendarPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* Legacy redirects */}
      <Route path="/login" element={<Navigate to="/family/login" replace />} />
      <Route path="/meals" element={<Navigate to="/family/meals" replace />} />
      <Route path="/shopping" element={<Navigate to="/family/shopping" replace />} />
      <Route path="/calendar" element={<Navigate to="/family/calendar" replace />} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </BrowserRouter>
  )
}
