import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthedUserEmail, getAuthedUserId, listUserLeaguesWithCounts, type UserLeagueSummary } from '../lib/leagueSync'
import { isSupabaseConfigured } from '../lib/supabase'
import { useLeague } from '../state/LeagueContext'

export function ChangeLeaguePage() {
  const navigate = useNavigate()
  const { setActiveLeague } = useLeague()
  const [email, setEmail] = useState<string>('')
  const [leagues, setLeagues] = useState<UserLeagueSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        if (!isSupabaseConfigured) {
          if (!cancelled) {
            setError('Supabase is not configured.')
            setIsLoading(false)
          }
          return
        }

        const [userId, userEmail] = await Promise.all([getAuthedUserId(), getAuthedUserEmail()])
        if (!userId) {
          if (!cancelled) {
            setError('Sign in first to change leagues.')
            setIsLoading(false)
          }
          return
        }

        const summaries = await listUserLeaguesWithCounts(userId)
        if (cancelled) return
        setEmail(userEmail ?? '')
        setLeagues(summaries)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load leagues.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="card">
      <div className="section-title">
        <h2>Change League</h2>
        <p>Select a league linked to your account.</p>
      </div>

      {email && <p className="hint">Signed in as: {email}</p>}

      {isLoading ? (
        <p className="hint">Loading leagues...</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : leagues.length === 0 ? (
        <p className="empty">No leagues found for this user yet.</p>
      ) : (
        <div className="list-stack">
          {leagues.map((item) => (
            <button
              key={item.leagueId}
              className="league-option"
              type="button"
              onClick={() => {
                void (async () => {
                  try {
                    await setActiveLeague(item.leagueId)
                    navigate('/leaderboard')
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Could not switch league.')
                  }
                })()
              }}
            >
              <span className="league-option-name">{item.leagueName}</span>
              <span className="league-option-meta">
                {item.playerCount} {item.playerCount === 1 ? 'player' : 'players'}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="row-actions">
        <button className="btn-outline" onClick={() => navigate('/')} type="button">
          Back
        </button>
      </div>
    </section>
  )
}

