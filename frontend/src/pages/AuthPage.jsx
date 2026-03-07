import { useState } from 'react'
import { supabase } from '../utils/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    setLoading(true); setError(null); setMessage(null)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email to confirm your account.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
            <span className="text-white font-bold">C</span>
          </div>
          <span className="font-display font-bold text-2xl text-text">CardLens</span>
        </div>

        <div className="bg-panel border border-border rounded-2xl p-8">
          <h2 className="font-display font-bold text-xl text-text mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-dim text-sm mb-6">
            {mode === 'login' ? 'Sign in to your account' : 'Start tracking your rewards'}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-dim uppercase tracking-widest mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text text-sm focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs font-mono text-dim uppercase tracking-widest mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text text-sm focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="••••••••" />
            </div>
          </div>

          {error && <p className="mt-4 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
          {message && <p className="mt-4 text-emerald text-xs bg-emerald/10 border border-emerald/20 rounded-lg px-3 py-2">{message}</p>}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full mt-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-display font-semibold text-sm transition-all flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" />Please wait…</> : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <p className="mt-4 text-center text-dim text-xs">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-violet-400 hover:text-violet-300 transition-colors">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}