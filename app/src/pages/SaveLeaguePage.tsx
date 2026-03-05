import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useLeague } from '../state/LeagueContext'

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

export function SaveLeaguePage() {
  const navigate = useNavigate()
  const { league, saveLeagueDetails, syncError } = useLeague()

  const [step, setStep] = useState<'email' | 'verify' | 'details'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [leagueName, setLeagueName] = useState(league.leagueName)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    let cancelled = false

    const applySignedInUser = (userEmail?: string): void => {
      if (cancelled || !userEmail) return
      setEmail((prev) => prev || userEmail.toLowerCase())
      setStep('details')
      setError('')
      setStatus('Email confirmed. Create your password to finish sign up.')
    }

    void (async () => {
      const { data } = await supabase.auth.getSession()
      applySignedInUser(data.session?.user?.email)
    })()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      applySignedInUser(session?.user?.email)
    })

    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  const canSubmitDetails = useMemo(() => {
    if (!leagueName.trim()) return false
    if (!password || password !== confirmPassword || password.length < 6) return false
    return true
  }, [leagueName, password, confirmPassword])

  async function sendCode(): Promise<void> {
    setError('')
    setStatus('')
    if (!email.trim()) {
      setError('Email is required.')
      return
    }

    if (isSupabaseConfigured && supabase) {
      const { error: supabaseError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/save`,
        },
      })
      if (supabaseError) {
        setError(supabaseError.message)
        return
      }
      setStatus('Verification code and magic link sent to your email.')
    } else {
      const localCode = `${Math.floor(100000 + Math.random() * 900000)}`
      setGeneratedCode(localCode)
      setStatus(`Dev mode code: ${localCode}`)
    }

    setStep('verify')
  }

  async function verifyCode(): Promise<void> {
    setError('')
    if (!code.trim()) {
      setError('Verification code is required.')
      return
    }

    if (isSupabaseConfigured && supabase) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      })
      if (verifyError) {
        setError(verifyError.message)
        return
      }
    } else if (generatedCode !== code.trim()) {
      setError('Incorrect code. Use the shown dev code.')
      return
    }

    setStep('details')
    setStatus('')
  }

  async function submitDetails(event: FormEvent): Promise<void> {
    event.preventDefault()
    setError('')

    if (!canSubmitDetails) {
      setError('Please complete all required fields.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (isSupabaseConfigured && supabase && password) {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(getErrorMessage(updateError, 'Could not set password for this account.'))
        return
      }
    }

    try {
      await saveLeagueDetails(leagueName, [email])
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to save league.'))
      return
    }
    setStatus('League saved successfully.')
    setTimeout(() => navigate('/leaderboard'), 900)
  }

  return (
    <section className="card">
      <div className="section-title">
        <h2>Sign Up</h2>
        <p>Finish saving your league by creating a password.</p>
      </div>

      {step === 'email' && (
        <div className="list-stack">
          <label className="field-label">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          </label>
          <button className="btn-primary" onClick={() => void sendCode()} type="button">
            Send Verification Code
          </button>
        </div>
      )}

      {step === 'verify' && (
        <div className="list-stack">
          <label className="field-label">
            <span>Verification code</span>
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="6-digit code" />
          </label>
          <div className="row-actions">
            <button className="btn-outline" onClick={() => setStep('email')} type="button">
              Back
            </button>
            <button className="btn-primary" onClick={() => void verifyCode()} type="button">
              Verify
            </button>
          </div>
        </div>
      )}

      {step === 'details' && (
        <form className="list-stack" onSubmit={(event) => void submitDetails(event)}>
          <label className="field-label">
            <span>League name (this can be changed later)</span>
            <input value={leagueName} onChange={(event) => setLeagueName(event.target.value)} />
          </label>

          <p className="hint">Create Password</p>
          <label className="field-label">
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <p className="hint">Use at least 6 characters.</p>
          <label className="field-label">
            <span>Confirm password</span>
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </label>

          <div className="row-actions">
            <button className="btn-outline" onClick={() => setStep('verify')} type="button">
              Back
            </button>
            <button className="btn-primary" disabled={!canSubmitDetails} type="submit">
              Save League
            </button>
          </div>
        </form>
      )}

      {(error || syncError) && <p className="error-text">{error || syncError}</p>}
      {status && <p className="success-text">{status}</p>}
    </section>
  )
}

