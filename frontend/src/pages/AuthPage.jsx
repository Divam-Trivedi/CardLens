import { useState } from 'react'
import { supabase } from '../utils/supabase'
import { Mail, Lock, Chrome, Github, Apple, Loader2 } from 'lucide-react'
import clsx from 'clsx'

export default function AuthPage() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(null)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const handle = async (action) => {
    setLoading(action)
    setError(null)
    setMessage(null)
    try {
      if (action === 'google') {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin }
        })
      } else if (action === 'github') {
        await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: { redirectTo: window.location.origin }
        })
      } else if (action === 'apple') {
        await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: { redirectTo: window.location.origin }
        })
      } else if (action === 'email') {
        if (mode === 'signup') {
          const { error } = await supabase.auth.signUp({ email, password })
          if (error) throw error
          setMessage('Check your email for a confirmation link.')
        } else if (mode === 'reset') {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
          })
          if (error) throw error
          setMessage('Password reset email sent — check your inbox.')
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error
        }
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-text">CardLens</h1>
          <p className="text-dim text-sm mt-1">Your credit card analyzer</p>
        </div>

        <div className="bg-panel border border-border rounded-2xl p-6">
          {/* Mode tabs */}
          {mode !== 'reset' && (
            <div className="flex bg-surface border border-border rounded-xl p-1 mb-6">
              {[['signin', 'Sign In'], ['signup', 'Sign Up']].map(([v, l]) => (
                <button key={v} onClick={() => { setMode(v); setError(null); setMessage(null) }}
                  className={clsx('flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                    mode === v ? 'bg-panel text-text shadow-sm' : 'text-dim hover:text-text')}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {mode === 'reset' && (
            <div className="mb-6">
              <h2 className="font-display font-semibold text-text mb-1">Reset Password</h2>
              <p className="text-dim text-xs">Enter your email and we'll send a reset link.</p>
            </div>
          )}

          {/* OAuth buttons */}
          {mode !== 'reset' && (
            <div className="flex justify-center gap-3 mb-5">
              {[
                { action: 'google', logo: 'logos/google_logo.png' },
                // { action: 'apple',  logo: 'logos/apple_logo_white.png'  },
                { action: 'github', logo: 'logos/github_logo.png' },
              ].map(({ action, logo }) => (
                <button key={action} onClick={() => handle(action)} disabled={!!loading}
                  className="w-12 h-12 rounded-xl border border-border bg-surface hover:border-muted flex items-center justify-center transition-all disabled:opacity-50">
                  {loading === action
                    ? <Loader2 size={16} className="animate-spin text-dim" />
                    : <img src={logo} alt={action} className="w-10 h-10 object-contain" />
                  }
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          {mode !== 'reset' && (
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-dim text-xs font-mono">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Email form */}
          <div className="space-y-3">
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-text text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            {mode !== 'reset' && (
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  onKeyDown={e => e.key === 'Enter' && handle('email')}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-text text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            )}

            {error && <p className="text-red-400 text-xs px-1">{error}</p>}
            {message && <p className="text-emerald text-xs px-1">{message}</p>}

            <button onClick={() => handle('email')} disabled={!!loading || !email || (mode !== 'reset' && !password)}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-display font-semibold transition-all flex items-center justify-center gap-2">
              {loading === 'email' && <Loader2 size={14} className="animate-spin" />}
              {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </button>
          </div>

          {/* Footer links */}
          <div className="mt-4 text-center space-y-1">
            {mode === 'signin' && (
              <button onClick={() => { setMode('reset'); setError(null); setMessage(null) }}
                className="text-xs text-dim hover:text-text transition-colors block w-full">
                Forgot password?
              </button>
            )}
            {mode === 'reset' && (
              <button onClick={() => { setMode('signin'); setError(null); setMessage(null) }}
                className="text-xs text-dim hover:text-text transition-colors">
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-dim text-xs mt-6">
          Secured by Supabase Auth · Your data is private
        </p>
      </div>
    </div>
  )
}