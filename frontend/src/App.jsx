import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './utils/supabase'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './components/Toast'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import StatementsPage from './pages/StatementsPage'
import TransactionsPage from './pages/TransactionsPage'
import CardsPage from './pages/CardsPage'
import AuthPage from './pages/AuthPage'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  // Loading
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
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
          <div className="flex min-h-screen bg-ink">
            <Sidebar onSignOut={handleSignOut} />
            <main className="ml-60 flex-1 p-8 overflow-y-auto min-h-screen">
              <Routes>
                <Route path="/"             element={<DashboardPage />} />
                <Route path="/upload"       element={<UploadPage />} />
                <Route path="/statements"   element={<StatementsPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/cards"        element={<CardsPage />} />
                <Route path="*"             element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}
