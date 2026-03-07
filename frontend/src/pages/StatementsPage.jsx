import { useState, useEffect } from 'react'
import { getStatements, deleteStatement } from '../utils/api'
import { fmt$ } from '../utils/colors'
import { Trash2, FileText, ChevronRight, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { EmptyStatements } from '../components/EmptyStates'
import clsx from 'clsx'

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const CARD_META = {
  amex_bce:  { label: 'Amex BCE',  color: '#2E77D0' },
  bofa_ccr:  { label: 'BofA CCR',  color: '#E31837' },
}

function getCardMeta(cardId, cards = []) {
  if (CARD_META[cardId]) return CARD_META[cardId]
  // Fallback for custom cards
  const card = cards.find(c => c.id === cardId)
  return { label: card?.name?.split(' ').slice(0, 2).join(' ') || cardId, color: '#8888AA' }
}

export default function StatementsPage() {
  const [statements, setStatements] = useState([])
  const [cards, setCards] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const data = await getStatements(filter === 'all' ? undefined : filter)
      setStatements(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  const handleDelete = async (id, filename, e) => {
    e.stopPropagation()
    if (!confirm(`Delete "${filename}" and all its transactions?`)) return
    try {
      await deleteStatement(id)
      toast.success(`Deleted ${filename}`)
      load()
    } catch {
      toast.error('Failed to delete statement')
    }
  }

  return (
    <div className="animate-fadeUp">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-text">Statements</h1>
          <p className="text-dim text-sm mt-1">{statements.length} uploaded</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg border border-border bg-panel text-dim hover:text-text transition-all"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>

          {/* Filter tabs */}
          <div className="flex bg-panel border border-border rounded-xl p-1 gap-1">
            {[['all', 'All Cards'], ['amex_bce', 'Amex BCE'], ['bofa_ccr', 'BofA CCR']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  filter === val ? 'bg-surface text-text' : 'text-dim hover:text-text'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : statements.length === 0 ? (
        <EmptyStatements />
      ) : (
        <div className="space-y-2">
          {statements.map(s => {
            const meta = getCardMeta(s.card_id, cards)
            const monthName = s.month ? MONTHS[s.month] : null
            const periodLabel = monthName && s.year
              ? `${monthName} ${s.year}`
              : s.year
              ? `${s.year}`
              : 'Unknown period'

            return (
              <div
                key={s.id}
                onClick={() => navigate(`/?statement_id=${s.id}`)}
                className="flex items-center gap-4 bg-panel border border-border rounded-xl px-5 py-4 cursor-pointer hover:border-muted transition-all group"
              >
                {/* Card color bar */}
                <div className="w-1.5 h-12 rounded-full shrink-0" style={{ background: meta.color }} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded-md border"
                      style={{ borderColor: meta.color + '40', color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span className="text-text font-display font-semibold text-sm">
                      {periodLabel}
                    </span>
                    {s.period_start && s.period_end && (
                      <span className="text-dim text-xs hidden sm:inline">
                        {s.period_start} → {s.period_end}
                      </span>
                    )}
                  </div>
                  <p className="text-dim text-xs truncate font-body">{s.filename}</p>
                </div>

                {/* Stats */}
                <div className="text-right shrink-0">
                  <p className="text-text font-mono text-sm font-medium">{fmt$(s.total_spend)}</p>
                  <p className="text-emerald text-xs">+{fmt$(s.total_rewards)} back</p>
                  {s.transaction_count > 0 && (
                    <p className="text-dim text-xs">{s.transaction_count} txns</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(s.id, s.filename, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-all"
                  >
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
