import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CreditCard, Upload, FileText, List, Sun, Moon, User } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import clsx from 'clsx'

const links = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload',       icon: Upload,          label: 'Upload' },
  { to: '/statements',   icon: FileText,        label: 'Statements' },
  { to: '/transactions', icon: List,            label: 'Transactions' },
  { to: '/cards',        icon: CreditCard,      label: 'Cards' },
]

export default function Sidebar({ onSignOut, user }) {
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const firstName = user?.user_metadata?.first_name || ''
  const lastName  = user?.user_metadata?.last_name  || ''
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'You'
  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : displayName.slice(0, 2).toUpperCase()

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-surface border-r border-border flex flex-col z-30 transition-colors duration-200">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-display font-bold text-lg text-text">CardLens</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-panel text-text border border-border'
                : 'text-dim hover:text-text hover:bg-panel/50'
            )}
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom — theme toggle + user */}
      <div className="px-4 py-4 border-t border-border space-y-3">
        {/* Theme toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-dim">
            {theme === 'dark' ? 'Dark mode' : 'Light mode'}
          </span>
          {/* Toggle pill */}
          <button
            onClick={toggle}
            className={clsx(
              'relative w-11 h-6 rounded-full border transition-all duration-300',
              theme === 'dark'
                ? 'bg-violet-600/30 border-violet-500/40'
                : 'bg-amber-400/20 border-amber-400/40'
            )}
            aria-label="Toggle theme"
          >
            <span className={clsx(
              'absolute top-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300',
              theme === 'dark'
                ? 'left-0.5 bg-violet-500'
                : 'left-5 bg-amber-400'
            )}>
              {theme === 'dark'
                ? <Moon size={11} className="text-white" />
                : <Sun size={11} className="text-white" />
              }
            </span>
          </button>
        </div>

        {/* User row */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2.5 w-full group hover:bg-panel rounded-xl px-2 py-1.5 transition-all -mx-2"
        >
          {/* Avatar */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-text text-xs font-medium truncate group-hover:text-violet-400 transition-colors">
              {displayName}
            </p>
            <p className="text-dim text-xs truncate font-mono">{user?.email}</p>
          </div>
          <User size={12} className="text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <button
          onClick={onSignOut}
          className="text-xs text-dim hover:text-red-400 transition-colors font-mono w-full text-left px-2"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
