import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useLeague } from '../state/LeagueContext'

export function ShareLeaguePage() {
  const navigate = useNavigate()
  const { league, saveLeagueDetails, syncError } = useLeague()
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerEmailReady, setOwnerEmailReady] = useState(!isSupabaseConfigured || !supabase)
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([])
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const hasSavedLeague = Boolean(league.isLeagueSaved || league.activeLeagueId)
  const shareUrl = useMemo(() => {
    if (!league.activeLeagueId) return ''
    const leagueName = encodeURIComponent(league.leagueName)
    return `${window.location.origin}/join/${league.activeLeagueId}?league=${leagueName}`
  }, [league.activeLeagueId, league.leagueName])

  useEffect(() => {
    let cancelled = false
    if (!isSupabaseConfigured || !supabase) {
      setOwnerEmailReady(true)
      return
    }

    void (async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (cancelled) return
        setOwnerEmail(data.user?.email?.toLowerCase() ?? '')
      } finally {
        if (!cancelled) setOwnerEmailReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ownerEmailReady) return
    const normalized = Array.from(new Set(league.members.map((email) => email.toLowerCase())))
    setAdditionalEmails(normalized.filter((email) => email !== ownerEmail))
  }, [league.members, ownerEmail, ownerEmailReady])

  function addAdditionalEmailRow(): void {
    setAdditionalEmails((prev) => [...prev, ''])
  }

  function updateAdditionalEmail(index: number, value: string): void {
    setAdditionalEmails((prev) => prev.map((email, idx) => (idx === index ? value : email)))
  }

  function removeAdditionalEmail(index: number): void {
    setAdditionalEmails((prev) => prev.filter((_, idx) => idx !== index))
  }

  async function saveEmails(): Promise<void> {
    setError('')
    setStatus('')
    const emailsToSave = Array.from(
      new Set(
        [ownerEmail, ...additionalEmails.map((email) => email.trim().toLowerCase())].filter(
          (email) => email.length > 0,
        ),
      ),
    )

    try {
      await saveLeagueDetails(league.leagueName, emailsToSave)
      setStatus('Member emails updated successfully.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update member emails.')
    }
  }

  if (!hasSavedLeague) {
    return (
      <section className="card">
        <div className="section-title">
          <h2>Share League</h2>
          <p>Save your league first, then share it.</p>
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
      <div className="section-title">
        <h2>Share League</h2>
        <p>Copy your unique league URL and manage member emails.</p>
      </div>

      <label className="field-label">
        <span>Unique league URL</span>
        <div className="invite-row">
          <input value={shareUrl} readOnly />
          <button
            className="btn-outline"
            type="button"
            onClick={() => {
              void (async () => {
                if (!shareUrl) return
                await navigator.clipboard.writeText(shareUrl)
                setStatus('League URL copied.')
              })()
            }}
          >
            Copy
          </button>
        </div>
      </label>

      <div className="section-title">
        <h2>Member Emails</h2>
        <p>(Optional) Add member emails</p>
      </div>

      {ownerEmailReady ? (
        <div className="list-stack">
          <label className="player-row owner-email-row">
            <span>Email 1 (You)</span>
            <div className="player-input-row">
              <input className="owner-email-input" value={ownerEmail || 'Signed-in email'} readOnly />
            </div>
          </label>

          {additionalEmails.map((email, idx) => (
            <label className="player-row" key={`share-member-email-${idx}`}>
              <span>Email {idx + 2}</span>
              <div className="player-input-row">
                <input
                  value={email}
                  onChange={(event) => updateAdditionalEmail(idx, event.target.value)}
                  placeholder="friend@example.com"
                />
                <button
                  className="remove-player-btn"
                  type="button"
                  onClick={() => removeAdditionalEmail(idx)}
                  aria-label={`Remove email ${idx + 2}`}
                  title={`Remove email ${idx + 2}`}
                >
                  X
                </button>
              </div>
            </label>
          ))}

          <button className="btn-outline" onClick={addAdditionalEmailRow} type="button">
            Add Email
          </button>
        </div>
      ) : null}

      <div className="row-actions">
        <button className="btn-outline" onClick={() => navigate('/leaderboard')} type="button">
          Back
        </button>
        <button className="btn-primary" onClick={() => void saveEmails()} type="button">
          Save Changes
        </button>
      </div>

      {(error || syncError) && <p className="error-text">{error || syncError}</p>}
      {status && <p className="success-text">{status}</p>}
    </section>
  )
}

