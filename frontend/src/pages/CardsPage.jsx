import { useEffect, useState } from 'react'
import { getCards, getStatements } from '../utils/api'
import api from '../utils/api'
import { fmt$ } from '../utils/colors'
import { CreditCard, Plus, Trash2, Sparkles, ChevronDown, ChevronUp, RotateCcw, X, Search } from 'lucide-react'
import { useToast } from '../components/Toast'
import clsx from 'clsx'

const CARD_CATALOG = [
  { id: 'amex_blue_cash_everyday',  name: 'Blue Cash Everyday',    bank: 'American Express', color: '#2E77D0', reward_type: 'cashback', annual_fee: 0,   tagline: '3% Supermarkets, Online & Gas' },
  { id: 'amex_blue_cash_preferred', name: 'Blue Cash Preferred',   bank: 'American Express', color: '#1A5FB4', reward_type: 'cashback', annual_fee: 95,  tagline: '6% Supermarkets, 3% Gas & Transit' },
  { id: 'amex_gold',                name: 'Gold Card',             bank: 'American Express', color: '#C9A84C', reward_type: 'points',   annual_fee: 250, tagline: '4x Dining & Groceries' },
  { id: 'amex_platinum',            name: 'Platinum Card',         bank: 'American Express', color: '#A8A9AD', reward_type: 'points',   annual_fee: 695, tagline: '5x Flights & Hotels' },
  { id: 'amex_everyday',            name: 'EveryDay Card',         bank: 'American Express', color: '#3A7BD5', reward_type: 'points',   annual_fee: 0,   tagline: '2x Supermarkets, no annual fee' },
  { id: 'bofa_customized_cash',     name: 'Customized Cash Rewards', bank: 'Bank of America', color: '#E31837', reward_type: 'cashback', annual_fee: 0,  tagline: '3% chosen category, 2% Grocery' },
  { id: 'bofa_unlimited_cash',      name: 'Unlimited Cash Rewards',  bank: 'Bank of America', color: '#C41230', reward_type: 'cashback', annual_fee: 0,  tagline: '1.5% on everything' },
  { id: 'bofa_travel_rewards',      name: 'Travel Rewards',          bank: 'Bank of America', color: '#B01020', reward_type: 'points',   annual_fee: 0,  tagline: '3x Travel, 2x Dining, no fee' },
  { id: 'bofa_premium_rewards',     name: 'Premium Rewards',         bank: 'Bank of America', color: '#8B0000', reward_type: 'points',   annual_fee: 95, tagline: '2x Travel & Dining' },
  { id: 'chase_sapphire_preferred', name: 'Sapphire Preferred',    bank: 'Chase',            color: '#1A1F71', reward_type: 'points',   annual_fee: 95,  tagline: '3x Dining & Online, 2x Travel' },
  { id: 'chase_sapphire_reserve',   name: 'Sapphire Reserve',      bank: 'Chase',            color: '#111540', reward_type: 'points',   annual_fee: 550, tagline: '3x Dining & Travel, 1.5¢/pt' },
  { id: 'chase_freedom_unlimited',  name: 'Freedom Unlimited',     bank: 'Chase',            color: '#2C3494', reward_type: 'cashback', annual_fee: 0,   tagline: '1.5% everything, 3% Dining' },
  { id: 'chase_freedom_flex',       name: 'Freedom Flex',          bank: 'Chase',            color: '#3D4DB5', reward_type: 'cashback', annual_fee: 0,   tagline: '5% rotating categories' },
  { id: 'chase_ink_business_cash',  name: 'Ink Business Cash',     bank: 'Chase',            color: '#0A1055', reward_type: 'cashback', annual_fee: 0,   tagline: '5% Office & Internet (business)' },
  { id: 'capital_one_venture',      name: 'Venture Rewards',       bank: 'Capital One',      color: '#C41F2E', reward_type: 'miles',    annual_fee: 95,  tagline: '2x miles on everything' },
  { id: 'capital_one_venture_x',    name: 'Venture X',             bank: 'Capital One',      color: '#8B0000', reward_type: 'miles',    annual_fee: 395, tagline: '10x Hotels, 5x Flights, 2x all' },
  { id: 'capital_one_quicksilver',  name: 'Quicksilver',           bank: 'Capital One',      color: '#D4A017', reward_type: 'cashback', annual_fee: 0,   tagline: '1.5% cash back on everything' },
  { id: 'capital_one_savor',        name: 'Savor Rewards',         bank: 'Capital One',      color: '#B8860B', reward_type: 'cashback', annual_fee: 95,  tagline: '4% Dining & Entertainment' },
  { id: 'capital_one_savor_one',    name: 'SavorOne',              bank: 'Capital One',      color: '#CD853F', reward_type: 'cashback', annual_fee: 0,   tagline: '3% Dining, Entertainment & Grocery' },
]

const BANKS = ['All', 'American Express', 'Bank of America', 'Chase', 'Capital One']
const REWARD_LABELS = { cashback: 'Cash Back', points: 'Points', miles: 'Miles' }

function parseRewardRules(card) {
  const rules = (card.config || {}).reward_rules || []
  const isPoints = card.reward_type === 'points' || card.reward_type === 'miles'
  return rules.map(rule => {
    const isDefault = (rule.categories || []).includes('*')
    const pct = rule.rate * (isPoints ? 1 : 100)
    const rateDisplay = isPoints
      ? `${pct}x ${REWARD_LABELS[card.reward_type] || 'pts'}`
      : `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)}% back`
    return {
      label: rateDisplay,
      desc: isDefault ? 'Everything else' : (rule.description || (rule.categories || []).join(', ')),
      rate: rule.rate,
    }
  }).sort((a, b) => b.rate - a.rate)
}

export default function CardsPage() {
  const [myCards, setMyCards] = useState([])
  const [stmtMap, setStmtMap] = useState({})
  const [showCatalog, setShowCatalog] = useState(false)
  const [bankFilter, setBankFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [expandedCard, setExpandedCard] = useState(null)
  const [showReset, setShowReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetConfirm, setResetConfirm] = useState('')
  const toast = useToast()

  const load = async () => {
    const [cards, stmts] = await Promise.all([getCards(), getStatements()])
    setMyCards(cards)
    const m = {}
    stmts.forEach(s => {
      if (!m[s.card_id]) m[s.card_id] = { count: 0, spend: 0, rewards: 0 }
      m[s.card_id].count++
      m[s.card_id].spend += s.total_spend || 0
      m[s.card_id].rewards += s.total_rewards || 0
    })
    setStmtMap(m)
  }

  useEffect(() => { load() }, [])

  const addCard = async (catalogCard) => {
    if (myCards.find(c => c.id === catalogCard.id)) {
      toast.info(`${catalogCard.name} is already in your wallet`)
      return
    }
    try {
      await api.post('/api/cards', {
        id: catalogCard.id,
        name: catalogCard.name,
        bank: catalogCard.bank,
        reward_type: catalogCard.reward_type,
        config: { color: catalogCard.color, annual_fee: catalogCard.annual_fee }
      })
      toast.success(`Added ${catalogCard.name} to your wallet`)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to add card')
    }
  }

  const removeCard = async (card, e) => {
    e.stopPropagation()
    const stats = stmtMap[card.id]
    const msg = stats?.count > 0
      ? `Remove ${card.name}? This will also delete ${stats.count} statement(s) and all their transactions.`
      : `Remove ${card.name} from your wallet?`
    if (!confirm(msg)) return
    try {
      await api.delete(`/api/cards/${card.id}`)
      toast.success(`Removed ${card.name}`)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to remove card')
    }
  }

  const handleReset = async () => {
    if (resetConfirm !== 'RESET') { toast.error('Type RESET to confirm'); return }
    setResetting(true)
    try {
      await api.post('/api/reset')
      toast.success('All data cleared. Your account is intact.')
      setShowReset(false)
      setResetConfirm('')
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Reset failed')
    } finally {
      setResetting(false)
    }
  }

  const myCardIds = myCards.map(c => c.id)
  const catalogFiltered = CARD_CATALOG.filter(c =>
    (bankFilter === 'All' || c.bank === bankFilter) &&
    (!search || c.name.toLowerCase().includes(search.toLowerCase()) || c.bank.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="animate-fadeUp max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-text">My Wallet</h1>
          <p className="text-dim text-sm mt-0.5">{myCards.length} card{myCards.length !== 1 ? 's' : ''} added</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowReset(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-all">
            <RotateCcw size={12} /> Reset All
          </button>
          <button onClick={() => setShowCatalog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all">
            <Plus size={14} /> Add Card
          </button>
        </div>
      </div>

      {/* Empty wallet */}
      {myCards.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl mb-6">
          <CreditCard size={36} strokeWidth={1} className="mx-auto mb-3 text-muted opacity-40" />
          <p className="font-display text-lg text-text mb-1">No cards in your wallet</p>
          <p className="text-dim text-sm mb-5">Add cards from the catalog to start tracking rewards</p>
          <button onClick={() => setShowCatalog(true)}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all">
            Browse Card Catalog
          </button>
        </div>
      )}

      {/* My cards */}
      <div className="space-y-3">
        {myCards.map(card => {
          const meta = CARD_CATALOG.find(c => c.id === card.id)
          const color = meta?.color || card.config?.color || '#8888AA'
          const stats = stmtMap[card.id] || { count: 0, spend: 0, rewards: 0 }
          const rate = stats.spend > 0 ? ((stats.rewards / stats.spend) * 100).toFixed(2) : '0.00'
          const rules = parseRewardRules(card)
          const isExpanded = expandedCard === card.id

          return (
            <div key={card.id} className="bg-panel border border-border rounded-2xl overflow-hidden group">
              <div className="h-1 w-full" style={{ background: color }} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-dim">{card.bank}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full border font-mono"
                        style={{ borderColor: color + '40', color, background: color + '12' }}>
                        {REWARD_LABELS[card.reward_type] || card.reward_type}
                      </span>
                      {meta?.annual_fee !== undefined && (
                        <span className="text-xs font-mono text-dim">
                          {meta.annual_fee === 0 ? 'No annual fee' : `$${meta.annual_fee}/yr`}
                        </span>
                      )}
                    </div>
                    <h2 className="font-display font-bold text-lg text-text">{card.name}</h2>
                    {meta?.tagline && <p className="text-dim text-xs mt-0.5">{meta.tagline}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-mono text-dim">Effective Rate</p>
                      <p className="font-display font-bold text-base" style={{ color }}>{rate}%</p>
                    </div>
                    <button onClick={(e) => removeCard(card, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-all"
                      title="Remove card">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[['Statements', stats.count], ['Total Spend', fmt$(stats.spend)], ['Rewards Earned', fmt$(stats.rewards)]].map(([l, v]) => (
                    <div key={l} className="bg-surface rounded-xl p-2.5">
                      <p className="text-dim text-xs font-mono mb-0.5">{l}</p>
                      <p className="text-text font-display font-semibold text-sm">{v}</p>
                    </div>
                  ))}
                </div>

                <button onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                  className="flex items-center gap-2 w-full text-left">
                  <Sparkles size={12} className="text-amber-400" />
                  <span className="text-xs font-mono text-dim uppercase tracking-widest flex-1">Reward Structure</span>
                  {isExpanded ? <ChevronUp size={12} className="text-dim" /> : <ChevronDown size={12} className="text-dim" />}
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-1.5 animate-fadeUp">
                    {rules.length > 0 ? rules.map((r, i) => (
                      <div key={i} className="flex items-start gap-3 py-1.5 border-t border-border/50 first:border-0">
                        <span className="text-xs font-mono font-bold min-w-28 shrink-0" style={{ color }}>{r.label}</span>
                        <span className="text-dim text-xs leading-relaxed">{r.desc}</span>
                      </div>
                    )) : (
                      <p className="text-dim text-xs py-1">No reward rules configured for this card.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Card Catalog Modal ── */}
      {showCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCatalog(false)} />
          <div className="relative bg-panel border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="font-display font-bold text-lg text-text">Card Catalog</h2>
                <p className="text-dim text-xs">{CARD_CATALOG.length} cards · Amex, BofA, Chase, Capital One</p>
              </div>
              <button onClick={() => setShowCatalog(false)} className="text-dim hover:text-text p-1"><X size={18} /></button>
            </div>

            <div className="px-6 py-3 border-b border-border space-y-3">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search cards…"
                  className="w-full pl-8 pr-4 py-2 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {BANKS.map(b => (
                  <button key={b} onClick={() => setBankFilter(b)}
                    className={clsx('px-3 py-1 rounded-full text-xs font-medium transition-all border',
                      bankFilter === b ? 'bg-violet-600 border-violet-600 text-white' : 'border-border text-dim hover:text-text')}>
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-1.5">
              {catalogFiltered.map(card => {
                const isAdded = myCardIds.includes(card.id)
                return (
                  <div key={card.id}
                    onClick={() => !isAdded && addCard(card)}
                    className={clsx('flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                      isAdded ? 'border-border bg-surface/50 opacity-50 cursor-default' : 'border-border bg-surface hover:border-violet-500/40 cursor-pointer group/item'
                    )}>
                    <div className="w-1 h-10 rounded-full shrink-0" style={{ background: card.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-dim">{card.bank}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded border font-mono"
                          style={{ borderColor: card.color + '40', color: card.color }}>
                          {REWARD_LABELS[card.reward_type]}
                        </span>
                        {card.annual_fee > 0 && <span className="text-xs text-dim font-mono">${card.annual_fee}/yr</span>}
                      </div>
                      <p className="text-text text-sm font-medium">{card.name}</p>
                      <p className="text-dim text-xs truncate">{card.tagline}</p>
                    </div>
                    <span className={clsx('text-xs font-mono px-2 py-1 rounded-lg border shrink-0 transition-all',
                      isAdded
                        ? 'text-dim border-border'
                        : 'text-violet-400 border-violet-500/20 bg-violet-500/10 group-hover/item:bg-violet-500/20')}>
                      {isAdded ? 'Added' : '+ Add'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Modal ── */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowReset(false)} />
          <div className="relative bg-panel border border-red-500/20 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <RotateCcw size={18} className="text-red-400" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-text">Reset Everything</h2>
                <p className="text-red-400 text-xs font-mono">This cannot be undone</p>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-3 mb-5 space-y-1 text-xs font-mono">
              <p className="text-emerald">✓ Account & login credentials preserved</p>
              <p className="text-red-400">✗ All cards deleted</p>
              <p className="text-red-400">✗ All statements deleted</p>
              <p className="text-red-400">✗ All transactions deleted</p>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-mono text-dim uppercase tracking-widest mb-2">
                Type <span className="text-red-400 font-bold">RESET</span> to confirm
              </label>
              <input value={resetConfirm} onChange={e => setResetConfirm(e.target.value)}
                placeholder="RESET"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:border-red-500 font-mono tracking-widest" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowReset(false); setResetConfirm('') }}
                className="flex-1 py-2.5 rounded-xl border border-border text-dim hover:text-text text-sm font-medium transition-all">
                Cancel
              </button>
              <button onClick={handleReset} disabled={resetting || resetConfirm !== 'RESET'}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium transition-all">
                {resetting ? 'Resetting…' : 'Reset Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
