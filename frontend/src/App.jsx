import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { usePlan } from './hooks/usePlan'
import Login from './pages/Login'
import Register from './pages/Register'
import ConfirmEmail from './pages/ConfirmEmail'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import Recurring from './pages/Recurring'
import Layout from './components/Layout'
import Categories from './pages/Categories'
import Cards from './pages/Cards'
import Profile from './pages/Profile'
import Planos from './pages/Planos'


function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  return !user ? children : <Navigate to="/dashboard" replace />
}

// Redireciona para /planos se o trial expirou
// Rotas liberadas mesmo expirado: /planos e /profile
function PlanGuard({ children }) {
  const { isExpired, loading } = usePlan()
  const path = window.location.pathname

  if (loading) return null

  const allowedWhenExpired = ['/planos', '/profile']
  if (isExpired && !allowedWhenExpired.includes(path)) {
    return <Navigate to="/planos" replace />
  }

  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/auth/confirm" element={<ConfirmEmail />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route path="dashboard"    element={<PlanGuard><Dashboard /></PlanGuard>} />
              <Route path="transactions" element={<PlanGuard><Transactions /></PlanGuard>} />
              <Route path="cards"        element={<PlanGuard><Cards /></PlanGuard>} />
              <Route path="budgets"      element={<PlanGuard><Budgets /></PlanGuard>} />
              <Route path="goals"        element={<PlanGuard><Goals /></PlanGuard>} />
              <Route path="recurring"    element={<PlanGuard><Recurring /></PlanGuard>} />
              <Route path="categories"   element={<PlanGuard><Categories /></PlanGuard>} />
              <Route path="profile"      element={<Profile />} />
              <Route path="planos"       element={<Planos />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}