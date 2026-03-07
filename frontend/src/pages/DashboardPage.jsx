import { useState, useEffect } from 'react'
import { getAnalytics, getStatements, getCards } from '../utils/api'
import { useSearchParams } from 'react-router-dom'
import { fmt$, CARD_COLORS } from '../utils/colors'
import ChartSection from '../components/Charts/ChartSection'
import { CategoryPieChart, CategoryBarChart, MerchantPieChart, MerchantBarChart, MonthlyBarChart } from '../components/Charts/SpendingCharts'
import { TrendingUp, CreditCard, Wallet, Sparkles } from 'lucide-react'
import clsx from 'clsx'
const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function StatCard({ label, value, sub, color, icon: Icon, delay=0 }) {
  return (
    <div className="bg-panel border border-border rounded-2xl p-5 animate-fadeUp" style={{ animationDelay:`${delay}ms` }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-dim text-xs font-mono uppercase tracking-widest">{label}</p>
        {Icon && <div className="p-1.5 rounded-lg bg-surface"><Icon size={14} style={{ color }} /></div>}
      </div>
      <p className="font-display font-bold text-2xl text-text">{value}</p>
      {sub && <p className="text-dim text-xs mt-1">{sub}</p>}
    </div>
  )
}
export default function DashboardPage() {
  const [searchParams] = useSearchParams()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cards, setCards] = useState([])
  const [statements, setStatements] = useState([])
  const [selectedCards, setSelectedCards] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [selectedStatement, setSelectedStatement] = useState(searchParams.get('statement_id') || null)
  const [rewardsMode, setRewardsMode] = useState(false)
  useEffect(() => { getCards().then(setCards); getStatements().then(setStatements) }, [])
  useEffect(() => { loadAnalytics() }, [selectedCards, selectedYear, selectedMonth, selectedStatement])
  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedCards.length) params.card_ids = selectedCards.join(',')
      if (selectedYear) params.year = selectedYear
      if (selectedMonth) params.month = selectedMonth
      if (selectedStatement) params.statement_id = selectedStatement
      setAnalytics(await getAnalytics(params))
    } finally { setLoading(false) }
  }
  const toggleCard = (id) => { setSelectedCards(prev => prev.includes(id) ? prev.filter(c=>c!==id) : [...prev,id]); setSelectedStatement(null) }
  const years = [...new Set(statements.map(s=>s.year).filter(Boolean))].sort((a,b)=>b-a)
  const months = selectedYear ? [...new Set(statements.filter(s=>s.year===selectedYear).map(s=>s.month).filter(Boolean))].sort((a,b)=>a-b) : []
  const filteredStatements = statements.filter(s => {
    if (selectedCards.length && !selectedCards.includes(s.card_id)) return false
    if (selectedYear && s.year !== selectedYear) return false
    if (selectedMonth && s.month !== selectedMonth) return false
    return true
  })
  const mode = rewardsMode ? 'rewards' : 'spend'
  return (
    <div className="animate-fadeUp">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="font-display font-bold text-2xl text-text">Dashboard</h1><p className="text-dim text-sm mt-0.5">Your spending at a glance</p></div>
        <div className="flex bg-panel border border-border rounded-xl p-1">
          {[['spend','Spending',Wallet,false],['rewards','Rewards',Sparkles,true]].map(([v,l,Icon,rm]) => (
            <button key={v} onClick={() => setRewardsMode(rm)} className={clsx('px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5', rewardsMode===rm ? 'bg-surface text-text' : 'text-dim hover:text-text')}>
              <Icon size={12}/>{l}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
        {cards.map(card => {
          const color = CARD_COLORS[card.id] || '#8888AA'
          const active = selectedCards.includes(card.id)
          return (
            <button key={card.id} onClick={() => toggleCard(card.id)} className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all', active ? 'text-text' : 'border-border bg-panel text-dim hover:text-text')} style={active ? { borderColor:color+'60', background:color+'15', color } : {}}>
              <div className="w-2 h-2 rounded-full" style={{ background:color }} />{card.name.split(' ').slice(0,3).join(' ')}
            </button>
          )
        })}
        <select value={selectedYear||''} onChange={e=>{setSelectedYear(e.target.value?+e.target.value:null);setSelectedMonth(null);setSelectedStatement(null)}} className="px-3 py-1.5 rounded-lg border border-border bg-panel text-dim text-xs focus:outline-none">
          <option value="">All Years</option>{years.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
        {selectedYear && <select value={selectedMonth||''} onChange={e=>{setSelectedMonth(e.target.value?+e.target.value:null);setSelectedStatement(null)}} className="px-3 py-1.5 rounded-lg border border-border bg-panel text-dim text-xs focus:outline-none">
          <option value="">All Months</option>{months.map(m=><option key={m} value={m}>{MONTHS[m]}</option>)}
        </select>}
        {filteredStatements.length > 0 && <select value={selectedStatement||''} onChange={e=>setSelectedStatement(e.target.value||null)} className="px-3 py-1.5 rounded-lg border border-border bg-panel text-dim text-xs focus:outline-none">
          <option value="">All Statements</option>{filteredStatements.map(s=><option key={s.id} value={s.id}>{MONTHS[s.month]||'?'} {s.year} — {s.card_id==='amex_bce'?'Amex':'BofA'}</option>)}
        </select>}
        {(selectedCards.length||selectedYear||selectedMonth||selectedStatement) ? <button onClick={()=>{setSelectedCards([]);setSelectedYear(null);setSelectedMonth(null);setSelectedStatement(null)}} className="px-3 py-1.5 rounded-lg border border-border bg-panel text-dim text-xs hover:text-red-400 transition-all">Clear</button> : null}
      </div>
      {loading ? (
        <div className="grid grid-cols-4 gap-4 mb-8">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-28 rounded-2xl"/>)}</div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Spend" value={fmt$(analytics.total_spend)} icon={CreditCard} color="#8B5CF6" delay={0}/>
            <StatCard label="Total Cashback" value={fmt$(analytics.total_reward)} sub={`${((analytics.total_reward/analytics.total_spend)*100||0).toFixed(2)}% effective rate`} icon={Sparkles} color="#2DD4A0" delay={100}/>
            <StatCard label="Top Category" value={analytics.by_category[0]?.category||'—'} sub={analytics.by_category[0]?fmt$(analytics.by_category[0].amount):''} icon={TrendingUp} color="#F5C842" delay={200}/>
            <StatCard label="Top Merchant" value={analytics.by_merchant[0]?.merchant||'—'} sub={analytics.by_merchant[0]?fmt$(analytics.by_merchant[0].amount):''} icon={Wallet} color="#E31837" delay={300}/>
          </div>
          {analytics.monthly?.length > 1 && (
            <div className="bg-panel border border-border rounded-2xl p-6 mb-6">
              <h3 className="font-display font-semibold text-text text-base mb-1">Monthly Trend</h3>
              <p className="text-dim text-xs mb-5">Spend vs Cashback over time</p>
              <MonthlyBarChart data={analytics.monthly}/>
            </div>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
            <ChartSection title={rewardsMode?'Rewards by Category':'Spending by Category'} subtitle={rewardsMode?'Cashback earned per category':'Where your money goes'} badge={`${analytics.by_category.length} categories`} pieChart={<CategoryPieChart data={analytics.by_category} mode={mode}/>} barChart={<CategoryBarChart data={analytics.by_category} mode={mode}/>}/>
            <ChartSection title={rewardsMode?'Rewards by Merchant':'Spending by Merchant'} subtitle={rewardsMode?'Cashback per merchant':'Top merchants by spend'} badge="Top 10" pieChart={<MerchantPieChart data={analytics.by_merchant} mode={mode}/>} barChart={<MerchantBarChart data={analytics.by_merchant} mode={mode}/>}/>
          </div>
        </>
      ) : (
        <div className="text-center py-24 text-dim"><p className="font-display text-lg">No data yet</p><p className="text-sm mt-1">Upload statements to see your analytics</p></div>
      )}
    </div>
  )
}
