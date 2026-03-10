import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import { getCards, getStatements } from '../utils/api'
import { fmt$ } from '../utils/colors'
import { CreditCard, FileText, TrendingUp, Calendar, Loader2, Save, Edit2 } from 'lucide-react'
import { useToast } from '../components/Toast'

const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CURRENT_YEAR = new Date().getFullYear()

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [cards, setCards] = useState([])
  const [statements, setStatements] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setFirstName(user?.user_metadata?.first_name || '')
      setLastName(user?.user_metadata?.last_name || '')

      const [c, s] = await Promise.all([getCards(), getStatements()])
      setCards(c)
      setStatements(s)
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { first_name: firstName.trim(), last_name: lastName.trim() }
      })
      if (error) throw error
      toast.success('Profile updated')
      setEditing(false)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-dim" />
      </div>
    )
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || user?.email?.split('@')[0]
  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : displayName.slice(0, 2).toUpperCase()

  // Current year statements only
  const yearStmts = statements.filter(s => s.year === CURRENT_YEAR)
  const totalSpendYTD = yearStmts.reduce((sum, s) => sum + (s.total_spend || 0), 0)
  const totalRewardsYTD = yearStmts.reduce((sum, s) => sum + (s.total_rewards || 0), 0)
  const effectiveRate = totalSpendYTD > 0 ? ((totalRewardsYTD / totalSpendYTD) * 100).toFixed(2) : '0.00'

  // Per-card statement counts
  const stmtsByCard = {}
  statements.forEach(s => {
    if (!stmtsByCard[s.card_id]) stmtsByCard[s.card_id] = []
    stmtsByCard[s.card_id].push(s)
  })

  // Oldest card (by first statement date)
  let oldestCardName = '—'
  let oldestDate = null
  cards.forEach(card => {
    const cardStmts = stmtsByCard[card.id] || []
    cardStmts.forEach(s => {
      const d = s.period_start ? new Date(s.period_start) : null
      if (d && (!oldestDate || d < oldestDate)) {
        oldestDate = d
        oldestCardName = card.name
      }
    })
  })

  // Average age of cards (months since first statement per card, averaged)
  const now = new Date()
  const cardAges = cards.map(card => {
    const cardStmts = stmtsByCard[card.id] || []
    if (!cardStmts.length) return null
    const dates = cardStmts.map(s => s.period_start ? new Date(s.period_start) : null).filter(Boolean)
    if (!dates.length) return null
    const earliest = new Date(Math.min(...dates))
    return (now - earliest) / (1000 * 60 * 60 * 24 * 30) // months
  }).filter(Boolean)
  const avgAgeMonths = cardAges.length
    ? Math.round(cardAges.reduce((a, b) => a + b, 0) / cardAges.length)
    : 0
  const avgAgeDisplay = avgAgeMonths >= 12
    ? `${(avgAgeMonths / 12).toFixed(1)} yrs`
    : `${avgAgeMonths} mo`

  // Monthly spend breakdown for current year
  const monthlySpend = Array(12).fill(0)
  yearStmts.forEach(s => {
    if (s.month >= 1 && s.month <= 12) {
      monthlySpend[s.month - 1] += s.total_spend || 0
    }
  })
  const maxMonthSpend = Math.max(...monthlySpend, 1)

  return (
    <div className="animate-fadeUp max-w-2xl">
      {/* Header card */}
      <div className="bg-panel border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xl">{initials}</span>
            </div>
            <div>
              {editing ? (
                <div className="flex gap-2 mb-1">
                  <input value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="px-2 py-1 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:border-violet-500 w-28" />
                  <input value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="px-2 py-1 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:border-violet-500 w-28" />
                </div>
              ) : (
                <h1 className="font-display font-bold text-2xl text-text">{displayName}</h1>
              )}
              <p className="text-dim text-sm font-mono">{user?.email}</p>
              <p className="text-dim text-xs font-mono mt-0.5">
                Member since {new Date(user?.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-dim hover:text-text text-xs transition-all">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-all">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Save
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-dim hover:text-text text-xs transition-all">
                <Edit2 size={12} /> Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* YTD summary stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: `Total Spend ${CURRENT_YEAR}`, value: fmt$(totalSpendYTD), icon: TrendingUp, color: 'text-violet-400' },
          { label: `Rewards Earned ${CURRENT_YEAR}`, value: fmt$(totalRewardsYTD), icon: TrendingUp, color: 'text-emerald' },
          { label: 'Effective Reward Rate', value: `${effectiveRate}%`, icon: TrendingUp, color: 'text-amber-400' },
          { label: 'Statements This Year', value: yearStmts.length, icon: FileText, color: 'text-blue-400' },
          { label: 'Total Cards', value: cards.length, icon: CreditCard, color: 'text-violet-400' },
          { label: 'Avg Card Age', value: avgAgeDisplay, icon: Calendar, color: 'text-dim' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-panel border border-border rounded-xl p-4">
            <p className="text-dim text-xs font-mono mb-2">{label}</p>
            <p className={`font-display font-bold text-xl ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Monthly spend bar chart */}
      <div className="bg-panel border border-border rounded-2xl p-5 mb-6">
        <h2 className="font-display font-semibold text-text mb-4 text-sm">Monthly Spend — {CURRENT_YEAR}</h2>
        <div className="flex items-end gap-1.5 h-24">
          {monthlySpend.map((val, i) => {
            const pct = val / maxMonthSpend
            const isCurrentMonth = i + 1 === new Date().getMonth() + 1
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-panel border border-border rounded-md px-1.5 py-0.5 text-xs font-mono text-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {fmt$(val)}
                </div>
                <div className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max(pct * 88, val > 0 ? 4 : 0)}px`,
                    background: isCurrentMonth
                      ? 'rgb(139, 92, 246)'
                      : val > 0 ? 'rgb(139, 92, 246, 0.4)' : 'var(--border)'
                  }} />
                <span className="text-dim text-xs font-mono">{MONTHS[i + 1]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-card breakdown */}
      <div className="bg-panel border border-border rounded-2xl p-5">
        <h2 className="font-display font-semibold text-text mb-4 text-sm">Cards & Statements</h2>
        {cards.length === 0 ? (
          <p className="text-dim text-sm">No cards added yet.</p>
        ) : (
          <div className="space-y-3">
            {cards.map(card => {
              const cardStmts = stmtsByCard[card.id] || []
              const yearCardStmts = cardStmts.filter(s => s.year === CURRENT_YEAR)
              const totalSpend = cardStmts.reduce((sum, s) => sum + (s.total_spend || 0), 0)
              const firstStmt = cardStmts.sort((a, b) => new Date(a.period_start) - new Date(b.period_start))[0]
              const firstDate = firstStmt?.period_start
                ? new Date(firstStmt.period_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : '—'

              return (
                <div key={card.id} className="flex items-center gap-3 py-3 border-t border-border first:border-0">
                  <div className="w-1.5 h-10 rounded-full shrink-0 bg-violet-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-text text-sm font-medium">{card.name}</p>
                    <p className="text-dim text-xs font-mono">{card.bank} · First statement: {firstDate}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-text text-sm font-mono font-medium">{cardStmts.length} statements</p>
                    <p className="text-dim text-xs">{yearCardStmts.length} this year · {fmt$(totalSpend)} total</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Oldest card callout */}
        {oldestCardName !== '—' && (
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs text-dim font-mono">
            <Calendar size={12} className="text-amber-400" />
            Oldest card on file: <span className="text-text font-medium">{oldestCardName}</span>
            {oldestDate && <span>since {oldestDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
