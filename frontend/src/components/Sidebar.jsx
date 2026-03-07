import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CreditCard, Upload, FileText, List, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import clsx from 'clsx'

const links = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload',      icon: Upload,          label: 'Upload' },
  { to: '/statements',  icon: FileText,        label: 'Statements' },
  { to: '/transactions',icon: List,            label: 'Transactions' },
  { to: '/cards',       icon: CreditCard,      label: 'Cards' },
]

export default function Sidebar({ onSignOut }) {
  const { theme, toggle } = useTheme()

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-surface border-r border-border flex flex-col z-30 transition-colors duration-200">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-display font-bold text-lg text-text">CardLens</span>
        </div>
        <p className="text-dim text-xs mt-1 font-body">Credit Card Analyzer</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-all',
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

      {/* Bottom controls */}
      <div className="px-5 py-5 border-t border-border space-y-3">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-2 text-xs text-dim hover:text-text transition-colors w-full font-mono"
        >
          {theme === 'dark'
            ? <><Sun size={13} /> Switch to Light Mode</>
            : <><Moon size={13} /> Switch to Dark Mode</>
          }
        </button>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted font-mono">Secured by Supabase</p>
          <button
            onClick={onSignOut}
            className="text-xs text-dim hover:text-red-400 transition-colors font-mono"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
