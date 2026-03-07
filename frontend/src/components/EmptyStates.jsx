import { BarChart2, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function EmptyDashboard() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-24 animate-fadeUp">
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl bg-panel border border-border flex items-center justify-center">
          <BarChart2 size={40} className="text-muted" strokeWidth={1} />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <span className="text-violet-400 text-xs font-mono">$</span>
        </div>
        <div className="absolute -bottom-2 -left-2 w-6 h-6 rounded-lg bg-emerald/20 border border-emerald/30 flex items-center justify-center">
          <span className="text-emerald text-xs">%</span>
        </div>
      </div>

      <h2 className="font-display font-bold text-xl text-text mb-2">No data yet</h2>
      <p className="text-dim text-sm text-center max-w-xs mb-8 leading-relaxed">
        Upload your first credit card statement to see spending insights, category breakdowns, and reward tracking.
      </p>

      {/* Steps */}
      <div className="flex gap-4 mb-8">
        {[
          { step: '1', label: 'Upload a PDF statement' },
          { step: '2', label: 'AI categorizes transactions' },
          { step: '3', label: 'See your insights' },
        ].map(({ step, label }) => (
          <div key={step} className="flex flex-col items-center gap-2 text-center">
            <div className="w-8 h-8 rounded-full bg-panel border border-border flex items-center justify-center">
              <span className="text-xs font-mono text-dim">{step}</span>
            </div>
            <p className="text-xs text-dim max-w-20 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/upload')}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-display font-semibold text-sm transition-all"
      >
        <Upload size={15} />
        Upload your first statement
      </button>
    </div>
  )
}

export function EmptyChart({ message = 'No data for this selection' }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-dim">
      <BarChart2 size={28} strokeWidth={1} className="mb-2 opacity-30" />
      <p className="text-sm font-body">{message}</p>
    </div>
  )
}

export function EmptyStatements() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-20 text-dim animate-fadeUp">
      <div className="w-16 h-16 rounded-2xl bg-panel border border-border flex items-center justify-center mb-4">
        <Upload size={24} strokeWidth={1} className="opacity-40" />
      </div>
      <p className="font-display text-lg text-text mb-1">No statements yet</p>
      <p className="text-sm mb-6">Upload PDF statements to get started</p>
      <button
        onClick={() => navigate('/upload')}
        className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all"
      >
        Upload Statement
      </button>
    </div>
  )
}
