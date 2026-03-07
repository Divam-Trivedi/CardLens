import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { getCategoryColor, getColor, fmt$ } from '../../utils/colors'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload || {}
  return (
    <div className="bg-panel border border-border rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-dim font-mono text-xs mb-1">{d.category || d.merchant || d.label}</p>
      <p className="text-text font-display font-semibold">{fmt$(payload[0]?.value)}</p>
      {d.percentage != null && <p className="text-dim text-xs">{d.percentage}% of total</p>}
      {d.reward != null && <p className="text-emerald text-xs mt-1">↑ {fmt$(d.reward)} cashback</p>}
    </div>
  )
}

export function CategoryPieChart({ data = [], mode = 'spend' }) {
  const key = mode === 'rewards' ? 'reward' : 'amount'
  const filtered = data.filter(d => d[key] > 0)
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={filtered} dataKey={key} nameKey="category" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} strokeWidth={0}>
          {filtered.map((e, i) => <Cell key={i} fill={getCategoryColor(e.category)} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend formatter={(v) => <span className="text-xs text-dim">{v}</span>} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function CategoryBarChart({ data = [], mode = 'spend' }) {
  const key = mode === 'rewards' ? 'reward' : 'amount'
  const sorted = [...data].filter(d => d[key] > 0).sort((a,b) => b[key]-a[key]).slice(0,12)
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={sorted} layout="vertical" margin={{ left:16, right:20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" horizontal={false} />
        <XAxis type="number" tickFormatter={v=>`$${v}`} tick={{ fill:'#8888AA', fontSize:11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="category" tick={{ fill:'#8888AA', fontSize:11 }} axisLine={false} tickLine={false} width={100} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill:'#2A2A3A' }} />
        <Bar dataKey={key} radius={[0,4,4,0]}>{sorted.map((_,i) => <Cell key={i} fill={getCategoryColor(sorted[i].category)} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MerchantPieChart({ data = [], mode = 'spend' }) {
  const key = mode === 'rewards' ? 'reward' : 'amount'
  const top = [...data].filter(d => d[key] > 0).slice(0,10)
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={top} dataKey={key} nameKey="merchant" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} strokeWidth={0}>
          {top.map((_,i) => <Cell key={i} fill={getColor(i)} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend formatter={(v) => <span className="text-xs text-dim">{v}</span>} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function MerchantBarChart({ data = [], mode = 'spend' }) {
  const key = mode === 'rewards' ? 'reward' : 'amount'
  const sorted = [...data].filter(d => d[key] > 0).sort((a,b) => b[key]-a[key]).slice(0,12)
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={sorted} layout="vertical" margin={{ left:16, right:20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" horizontal={false} />
        <XAxis type="number" tickFormatter={v=>`$${v}`} tick={{ fill:'#8888AA', fontSize:11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="merchant" tick={{ fill:'#8888AA', fontSize:11 }} axisLine={false} tickLine={false} width={110} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill:'#2A2A3A' }} />
        <Bar dataKey={key} radius={[0,4,4,0]}>{sorted.map((_,i) => <Cell key={i} fill={getColor(i)} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MonthlyBarChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left:0, right:20, top:8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" vertical={false} />
        <XAxis dataKey="label" tick={{ fill:'#8888AA', fontSize:11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v=>`$${v}`} tick={{ fill:'#8888AA', fontSize:11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill:'#2A2A3A' }} />
        <Bar dataKey="total_spend" fill="#8B5CF6" radius={[4,4,0,0]} name="Spend" />
        <Bar dataKey="total_reward" fill="#2DD4A0" radius={[4,4,0,0]} name="Cashback" />
      </BarChart>
    </ResponsiveContainer>
  )
}
