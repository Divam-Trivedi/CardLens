import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './utils/supabase'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './components/Toast'
import OnboardingModal from './components/OnboardingModal'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import StatementsPage from './pages/StatementsPage'
import TransactionsPage from './pages/TransactionsPage'
import CardsPage from './pages/CardsPage'
import ProfilePage from './pages/ProfilePage'
import AuthPage from './pages/AuthPage'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [user, setUser] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        setUser(session.user)
        // Show onboarding if name not set yet
        if (!session.user.user_metadata?.onboarded) {
          setShowOnboarding(true)
        }
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        setUser(session.user)
        if (!session.user.user_metadata?.onboarded) {
          setShowOnboarding(true)
        }
      } else {
        setUser(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
  }

  const handleOnboardingComplete = (meta) => {
    setShowOnboarding(false)
    // Update local user object with new metadata
    setUser(prev => prev ? {
      ...prev,
      user_metadata: { ...prev.user_metadata, ...meta, onboarded: true }
    } : prev)
  }

  // Loading
  if (session === undefined) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-ink flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </ThemeProvider>
    )
  }

  // Not logged in
  if (!session) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <AuthPage />
        </ToastProvider>
      </ThemeProvider>
    )
  }

  // Logged in
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          {showOnboarding && (
            <OnboardingModal onComplete={handleOnboardingComplete} />
          )}
          <div className="flex min-h-screen bg-ink">
            <Sidebar onSignOut={handleSignOut} user={user} />
            <main className="ml-60 flex-1 p-8 overflow-y-auto min-h-screen">
              <Routes>
                <Route path="/"             element={<DashboardPage />} />
                <Route path="/upload"       element={<UploadPage />} />
                <Route path="/statements"   element={<StatementsPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/cards"        element={<CardsPage />} />
                <Route path="/profile"      element={<ProfilePage />} />
                <Route path="*"             element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}
