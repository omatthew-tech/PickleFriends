import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../state/LeagueContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function EditLeaguePage() {
  const navigate = useNavigate()
  const { league, saveLeagueDetails, syncError } = useLeague()

  const [leagueName, setLeagueName] = useState(league.leagueName)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    setLeagueName(league.leagueName)
  }, [league.leagueName])

  const hasSavedLeague = Boolean(league.isLeagueSaved || league.activeLeagueId)

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setError('')
    setStatus('')
    if (!leagueName.trim()) {
      setError('League name is required.')
      return
    }

    try {
      await saveLeagueDetails(leagueName, league.members)
      setStatus('League name updated successfully.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update league name.')
    }
  }

  if (!hasSavedLeague) {
    return (
      <section className="card">
        <div className="section-title">
          <h2>Edit League</h2>
          <p>Save your league first, then you can edit it anytime.</p>
        </div>
        <div className="row-actions">
          <button className="btn-primary" onClick={() => navigate('/save')} type="button">
            Save for Next Time
          </button>
          <button className="btn-outline" onClick={() => navigate('/leaderboard')} type="button">
            Back
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="edit-league-header">
        <div className="section-title">
          <h2>Edit League</h2>
          <p>Update league name and add additional member emails.</p>
        </div>
        {isSupabaseConfigured && supabase && (
          <button
            className="btn-outline"
            type="button"
            onClick={() => {
              void (async () => {
                if (!supabase) return
                await supabase.auth.signOut()
                navigate('/')
              })()
            }}
          >
            Sign Out
          </button>
        )}
      </div>

      <form className="list-stack" onSubmit={(event) => void submit(event)}>
        <label className="field-label">
          <span>League name</span>
          <input value={leagueName} onChange={(event) => setLeagueName(event.target.value)} />
        </label>

        <div className="row-actions">
          <button className="btn-outline" onClick={() => navigate('/leaderboard')} type="button">
            Back
          </button>
          <button className="btn-primary" type="submit">
            Save Changes
          </button>
        </div>
      </form>

      {(error || syncError) && <p className="error-text">{error || syncError}</p>}
      {status && <p className="success-text">{status}</p>}
    </section>
  )
}

