import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { usePlan } from '../hooks/usePlan'
import { useState, useEffect } from 'react'
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
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/transactions', label: 'Transações',   icon: ArrowLeftRight },
  { to: '/cards',        label: 'Cartões',      icon: CreditCard },
  { to: '/budgets',      label: 'Orçamentos',   icon: Wallet },
  { to: '/goals',        label: 'Metas',        icon: Target },
  { to: '/recurring',    label: 'Assinaturas / Transações Recorrentes', icon: RefreshCw },
  { to: '/categories',   label: 'Categorias',   icon: Tag },
  { to: '/planos',       label: 'Planos',       icon: Zap },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { isExpired } = usePlan()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Fecha sidebar ao navegar
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Bloqueia scroll do body quando sidebar aberta no mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const visibleNav = isExpired
    ? navItems.filter(({ to }) => to === '/planos')
    : navItems

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-1 border-b border-gray-100 dark:border-gray-800">
        <img src="/gemini-svg.png" className="w-full h-30 object-contain" />
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
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                     text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800
                     hover:text-gray-900 dark:hover:text-gray-200 transition-all"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          {isDark ? 'Modo Claro' : 'Modo Escuro'}
        </button>

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
    </>
  )

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">

      {/* ── SIDEBAR DESKTOP (sempre visível em md+) ── */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-col shadow-sm flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* ── SIDEBAR MOBILE (drawer) ── */}
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-900 flex flex-col shadow-xl
                    transform transition-transform duration-300 ease-in-out md:hidden
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent />
      </aside>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <Menu size={22} />
          </button>
          <img src="/gemini-svg.png" className="h-14 object-contain" />
          {/* Avatar pequeno no canto direito */}
          <NavLink to="/profile">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-700 dark:text-primary-400">
                {initials}
              </span>
            </div>
          </NavLink>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}