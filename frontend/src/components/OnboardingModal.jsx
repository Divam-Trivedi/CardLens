import { useState } from 'react'
import { supabase } from '../utils/supabase'
import { Loader2, User } from 'lucide-react'

export default function OnboardingModal({ onComplete }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    if (!firstName.trim()) { setError('First name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          onboarded: true
        }
      })
      if (error) throw error
      onComplete({ first_name: firstName.trim(), last_name: lastName.trim() })
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-panel border border-border rounded-2xl w-full max-w-sm p-7 shadow-2xl animate-fadeUp">
        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mb-5">
          <User size={22} className="text-violet-400" />
        </div>

        <h2 className="font-display font-bold text-xl text-text mb-1">Welcome to CardLens</h2>
        <p className="text-dim text-sm mb-6 leading-relaxed">
          Before we start, what should we call you?
        </p>

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-mono text-dim uppercase tracking-widest mb-1.5">
              First Name <span className="text-red-400">*</span>
            </label>
            <input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Jane"
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-text text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-dim uppercase tracking-widest mb-1.5">
              Last Name
            </label>
            <input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Smith"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-text text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || !firstName.trim()}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-display font-semibold text-sm transition-all flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : "Let's go →"}
        </button>
      </div>
    </div>
  )
}
