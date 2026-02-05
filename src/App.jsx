import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './context/UserContext'
import LoginScreen from './components/LoginScreen'
import Layout from './components/Layout'
import ChoresPage from './pages/Chores'
import MealsPage from './pages/Meals'
import MealsManagerPage from './pages/MealsManager'
import ShoppingPage from './pages/Shopping'
import CalendarPage from './pages/Calendar'

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
    return <Navigate to="/login" replace />
  }
  
  if (requireParent && user.role !== 'parent') {
    return <Navigate to="/" replace />
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
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginScreen />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <ChoresPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/meals" element={
        <ProtectedRoute requireParent>
          <Layout>
            <MealsPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/meals/manage" element={
        <ProtectedRoute requireParent>
          <Layout>
            <MealsManagerPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/shopping" element={
        <ProtectedRoute requireParent>
          <Layout>
            <ShoppingPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/calendar" element={
        <ProtectedRoute>
          <Layout>
            <CalendarPage />
          </Layout>
        </ProtectedRoute>
      } />
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
