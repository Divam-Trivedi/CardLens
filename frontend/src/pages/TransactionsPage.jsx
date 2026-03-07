import { useState, useEffect } from 'react'
import { getTransactions, getCards } from '../utils/api'
import { fmt$, getCategoryColor, CARD_COLORS } from '../utils/colors'
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'

const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCard, setFilterCard] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    Promise.all([getTransactions(), getCards()]).then(([txns, cards]) => {
      setTransactions(txns)
      setCards(cards)
      setLoading(false)
    })
  }, [])

  // Derived values
  const categories = [...new Set(transactions.map(t => t.category).filter(Boolean))].sort()

  const filtered = transactions
    .filter(t => {
      if (filterCard && t.card_id !== filterCard) return false
      if (filterCategory && t.category !== filterCategory) return false
      if (search) {
        const s = search.toLowerCase()
        return (
          t.description?.toLowerCase().includes(s) ||
          t.merchant?.toLowerCase().includes(s) ||
          t.category?.toLowerCase().includes(s)
        )
      }
      return true
    })
    .sort((a, b) => {
      let av = a[sortBy], bv = b[sortBy]
      if (sortBy === 'date') { av = new Date(av); bv = new Date(bv) }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const totalFiltered = filtered.reduce((sum, t) => sum + t.amount, 0)
  const totalRewards = filtered.reduce((sum, t) => sum + (t.reward_earned || 0), 0)

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ChevronDown size={12} className="text-muted opacity-40" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-violet-400" />
      : <ChevronDown size={12} className="text-violet-400" />
  }

  return (
    <div className="animate-fadeUp">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-text">Transactions</h1>
          <p className="text-dim text-sm mt-0.5">{filtered.length} transactions · {fmt$(totalFiltered)} · {fmt$(totalRewards)} cashback</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search merchant, description…"
            className="w-full pl-8 pr-4 py-2 rounded-lg border border-border bg-panel text-text text-sm focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {/* Card filter */}
        <select
          value={filterCard}
          onChange={e => setFilterCard(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-panel text-dim text-sm focus:outline-none"
        >
          <option value="">All Cards</option>
          {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-panel text-dim text-sm focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {(search || filterCard || filterCategory) && (
          <button
            onClick={() => { setSearch(''); setFilterCard(''); setFilterCategory('') }}
            className="px-3 py-2 rounded-lg border border-border bg-panel text-dim text-sm hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-dim">
          <Search size={32} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
          <p className="font-display">No transactions found</p>
          <p className="text-xs mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2 text-xs font-mono text-dim uppercase tracking-widest mb-1">
            <button onClick={() => toggleSort('date')} className="col-span-2 flex items-center gap-1 hover:text-text transition-colors">Date <SortIcon col="date" /></button>
            <span className="col-span-4">Merchant</span>
            <span className="col-span-2">Category</span>
            <span className="col-span-1">Card</span>
            <button onClick={() => toggleSort('amount')} className="col-span-2 flex items-center gap-1 justify-end hover:text-text transition-colors">Amount <SortIcon col="amount" /></button>
            <button onClick={() => toggleSort('reward_earned')} className="col-span-1 flex items-center gap-1 justify-end hover:text-text transition-colors">Reward <SortIcon col="reward_earned" /></button>
          </div>

          <div className="space-y-1">
            {filtered.map(t => {
              const cardColor = CARD_COLORS[t.card_id] || '#8888AA'
              const isExpanded = expanded === t.id
              const dateObj = new Date(t.date)

              return (
                <div key={t.id}>
                  <div
                    onClick={() => setExpanded(isExpanded ? null : t.id)}
                    className={clsx(
                      'grid grid-cols-12 gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all text-sm',
                      isExpanded
                        ? 'bg-panel border-violet-500/30 rounded-b-none'
                        : 'bg-panel border-border hover:border-muted'
                    )}
                  >
                    {/* Date */}
                    <div className="col-span-2 text-dim font-mono text-xs flex flex-col justify-center">
                      <span>{MONTHS[dateObj.getMonth() + 1]}</span>
                      <span>{dateObj.getDate()}, {dateObj.getFullYear()}</span>
                    </div>

                    {/* Merchant */}
                    <div className="col-span-4 flex flex-col justify-center min-w-0">
                      <p className="text-text font-medium truncate">{t.merchant || t.description}</p>
                      {t.merchant && t.merchant !== t.description && (
                        <p className="text-dim text-xs truncate">{t.description}</p>
                      )}
                    </div>

                    {/* Category */}
                    <div className="col-span-2 flex items-center">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium truncate"
                        style={{
                          background: getCategoryColor(t.category) + '20',
                          color: getCategoryColor(t.category)
                        }}
                      >
                        {t.category}
                      </span>
                    </div>

                    {/* Card indicator */}
                    <div className="col-span-1 flex items-center">
                      <div className="w-2 h-2 rounded-full" style={{ background: cardColor }} title={t.card_id} />
                    </div>

                    {/* Amount */}
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="text-text font-mono font-medium">{fmt$(t.amount)}</span>
                    </div>

                    {/* Reward */}
                    <div className="col-span-1 flex items-center justify-end">
                      <span className="text-emerald font-mono text-xs">{fmt$(t.reward_earned)}</span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="bg-panel border border-violet-500/30 border-t-0 rounded-b-xl px-4 py-3 grid grid-cols-3 gap-4">
                      {[
                        ['Full Description', t.description],
                        ['Reward Rate', `${(t.reward_rate * 100).toFixed(0)}% cashback`],
                        ['Card', cards.find(c => c.id === t.card_id)?.name || t.card_id],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-xs font-mono text-dim uppercase tracking-widest mb-1">{label}</p>
                          <p className="text-text text-sm">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
