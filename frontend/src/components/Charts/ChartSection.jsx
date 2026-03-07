import { useState } from 'react'
import { PieChart, BarChart2 } from 'lucide-react'
import clsx from 'clsx'
export default function ChartSection({ title, subtitle, pieChart, barChart, badge }) {
  const [view, setView] = useState('pie')
  return (
    <div className="bg-panel border border-border rounded-2xl p-6 animate-fadeUp">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-text text-base">{title}</h3>
            {badge && <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-surface border border-border text-dim">{badge}</span>}
          </div>
          {subtitle && <p className="text-dim text-xs mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex bg-surface border border-border rounded-lg p-0.5">
          {[['pie','Pie',PieChart],['bar','Bar',BarChart2]].map(([v,l,Icon]) => (
            <button key={v} onClick={() => setView(v)} className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all', view===v ? 'bg-panel text-text' : 'text-dim hover:text-text')}>
              <Icon size={12} />{l}
            </button>
          ))}
        </div>
      </div>
      {view === 'pie' ? pieChart : barChart}
    </div>
  )
}
