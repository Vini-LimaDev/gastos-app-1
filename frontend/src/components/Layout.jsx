import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { usePlan } from '../hooks/usePlan'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  Wallet,
  RefreshCw,
  LogOut,
  Sun,
  Moon,
  Tag,
  CreditCard,
  UserCircle,
  Zap,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/transactions', label: 'Transações',   icon: ArrowLeftRight },
  { to: '/cards',        label: 'Cartões',      icon: CreditCard },
  { to: '/budgets',      label: 'Orçamentos',   icon: Wallet },
  { to: '/goals',        label: 'Metas',        icon: Target },
  { to: '/recurring',    label: 'Assinaturas / Transações Recorrentes',  icon: RefreshCw },
  { to: '/categories',   label: 'Categorias',   icon: Tag },
  { to: '/planos',       label: 'Planos',       icon: Zap },  
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { isExpired } = usePlan()

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const visibleNav = isExpired
    ? navItems.filter(({ to }) => to === '/planos')
    : navItems

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col shadow-sm flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <img
              src="/gemini-svg.svg"
              className="w-100% h-20 object-contain"
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: theme toggle + user */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                       text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800
                       hover:text-gray-900 dark:hover:text-gray-200 transition-all"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            {isDark ? 'Modo Claro' : 'Modo Escuro'}
          </button>

          {/* User info — clicável para ir ao perfil */}
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl transition-all group ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`
            }
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary-700 dark:text-primary-400">
                {initials}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
            <UserCircle
              size={15}
              className="text-gray-300 dark:text-gray-600 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors flex-shrink-0"
            />
          </NavLink>

          {/* Logout */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                       text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20
                       hover:text-red-600 dark:hover:text-red-400 transition-all"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}