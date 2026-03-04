import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function HomePage() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsAuthenticated(false)
      return
    }

    let cancelled = false
    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (!cancelled) setIsAuthenticated(Boolean(data.session?.user))
    })()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setIsAuthenticated(Boolean(session?.user))
    })

    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  return (
    <section className="home-page">
      <div className="court-shell">
        <div className="court-lines">
          <div className="court-kitchen top" />
          <div className="court-kitchen bottom" />
          <div className="court-center-line" />
          <div className="court-net" />

          <div className="home-center-panel">
            <h2>Ready To Play?</h2>
            <p>Create your league in seconds or continue where you left off.</p>
            <div className="home-actions">
              <button className="btn-primary" onClick={() => navigate('/create-bracket')} type="button">
                {isAuthenticated ? 'Create New League' : 'Get Started - No Sign Up Required'}
              </button>
              <button className="btn-secondary" onClick={() => navigate(isAuthenticated ? '/change-league' : '/login')} type="button">
                {isAuthenticated ? 'Change League' : 'Existing User'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

