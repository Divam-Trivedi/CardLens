import { useState, useEffect } from 'react'
import { getStatements, getCards } from '../utils/api'
import api from '../utils/api'
import { fmt$ } from '../utils/colors'
import { Trash2, FileText, ChevronRight, RefreshCw, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { EmptyStatements } from '../components/EmptyStates'
import clsx from 'clsx'

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December']

const CARD_COLORS = {
  amex_blue_cash_everyday:  '#2E77D0',
  amex_blue_cash_preferred: '#1A5FB4',
  amex_gold:                '#C9A84C',
  amex_platinum:            '#A8A9AD',
  amex_everyday:            '#3A7BD5',
  bofa_customized_cash:     '#E31837',
  bofa_unlimited_cash:      '#C41230',
  bofa_travel_rewards:      '#B01020',
  bofa_premium_rewards:     '#8B0000',
  chase_sapphire_preferred: '#1A1F71',
  chase_sapphire_reserve:   '#111540',
  chase_freedom_unlimited:  '#2C3494',
  chase_freedom_flex:       '#3D4DB5',
  chase_ink_business_cash:  '#0A1055',
  capital_one_venture:      '#C41F2E',
  capital_one_venture_x:    '#8B0000',
  capital_one_quicksilver:  '#D4A017',
  capital_one_savor:        '#B8860B',
  capital_one_savor_one:    '#CD853F',
}

function getCardColor(cardId) {
  return CARD_COLORS[cardId] || '#8888AA'
}

export default function StatementsPage() {
  const [statements, setStatements] = useState([])
  const [cards, setCards] = useState([])
  const [filterMode, setFilterMode] = useState('all') // 'all' | 'card'
  const [selectedCard, setSelectedCard] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [stmts, cardList] = await Promise.all([getStatements(), getCards()])
      setCards(cardList)
      if (!selectedCard && cardList.length > 0) setSelectedCard(cardList[0].id)
      setStatements(stmts)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id, filename, e) => {
    e.stopPropagation()
    if (!confirm(`Delete "${filename}" and all its transactions?`)) return
    try {
      await api.delete(`/api/statements/${id}`)
      toast.success(`Deleted ${filename}`)
      load()
    } catch {
      toast.error('Failed to delete statement')
    }
  }

  // Filter statements
  const filtered = filterMode === 'all'
    ? statements
    : statements.filter(s => s.card_id === selectedCard)

  const selectedCardObj = cards.find(c => c.id === selectedCard)

  return (
    <div className="animate-fadeUp">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-text">Statements</h1>
          <p className="text-dim text-sm mt-0.5">{filtered.length} statement{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={load}
            className="p-2 rounded-lg border border-border bg-panel text-dim hover:text-text transition-all" title="Refresh">
            <RefreshCw size={14} />
          </button>

          {/* All / Card toggle */}
          <div className="flex bg-panel border border-border rounded-xl p-1 gap-1">
            <button
              onClick={() => setFilterMode('all')}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filterMode === 'all' ? 'bg-surface text-text' : 'text-dim hover:text-text'
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('card')}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filterMode === 'card' ? 'bg-surface text-text' : 'text-dim hover:text-text'
              )}
            >
              By Card
            </button>
          </div>

          {/* Card dropdown — only show when "By Card" is selected */}
          {filterMode === 'card' && cards.length > 0 && (
            <div className="relative">
              <select
                value={selectedCard}
                onChange={e => setSelectedCard(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-border bg-panel text-text text-sm focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                {cards.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyStatements />
      ) : (
        <div className="space-y-2">
          {filtered.map(s => {
            const color = getCardColor(s.card_id)
            const card = cards.find(c => c.id === s.card_id)
            const monthName = s.month ? MONTHS[s.month] : null
            const periodLabel = monthName && s.year
              ? `${monthName} ${s.year}`
              : s.year ? `${s.year}` : 'Unknown period'

            return (
              <div
                key={s.id}
                onClick={() => navigate(`/?statement_id=${s.id}`)}
                className="flex items-center gap-4 bg-panel border border-border rounded-xl px-5 py-4 cursor-pointer hover:border-muted transition-all group"
              >
                <div className="w-1.5 h-12 rounded-full shrink-0" style={{ background: color }} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded-md border"
                      style={{ borderColor: color + '40', color }}>
                      {card?.name || s.card_id}
                    </span>
                    <span className="text-text font-display font-semibold text-sm">{periodLabel}</span>
                    {s.period_start && s.period_end && (
                      <span className="text-dim text-xs hidden sm:inline">{s.period_start} → {s.period_end}</span>
                    )}
                  </div>
                  <p className="text-dim text-xs truncate font-body">{s.filename}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-text font-mono text-sm font-medium">{fmt$(s.total_spend)}</p>
                  <p className="text-emerald text-xs">+{fmt$(s.total_rewards)} back</p>
                  {s.transaction_count > 0 && (
                    <p className="text-dim text-xs">{s.transaction_count} txns</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={(e) => handleDelete(s.id, s.filename, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-all">
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={14} className="text-muted" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
