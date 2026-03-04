import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useLeague } from '../state/LeagueContext'

export function JoinLeaguePage() {
  const navigate = useNavigate()
  const { setActiveLeague, refreshFromSupabase } = useLeague()
  const params = useParams<{ leagueId: string }>()
  const [search] = useSearchParams()

  const leagueId = params.leagueId ?? ''
  const leagueName = decodeURIComponent(search.get('league') ?? 'this league')

  const [step, setStep] = useState<'email' | 'verify' | 'signup'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const canSignUp = useMemo(() => {
    if (!password) return true
    return password.length >= 6 && password === confirmPassword
  }, [password, confirmPassword])

  async function sendCode(): Promise<void> {
    setError('')
    setStatus('')
    if (!email.trim()) {
      setError('Email is required.')
      return
    }
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured.')
      return
    }

    const { error: sendError } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() })
    if (sendError) {
      setError(sendError.message)
      return
    }

    setStatus('Verification code sent.')
    setStep('verify')
  }

  async function verifyCode(): Promise<void> {
    setError('')
    if (!code.trim()) {
      setError('Verification code is required.')
      return
    }
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured.')
      return
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    })

    if (verifyError) {
      setError(verifyError.message)
      return
    }

    setStatus('Email confirmed.')
    setStep('signup')
  }

  async function signUp(event: FormEvent): Promise<void> {
    event.preventDefault()
    setError('')
    setStatus('')
    if (!canSignUp) {
      setError('Passwords must match and be at least 6 characters.')
      return
    }
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured.')
      return
    }

    if (password) {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }
    }

    const normalizedEmail = email.trim().toLowerCase()
    const { data: inviteRows, error: inviteLookupError } = await supabase
      .from('league_invites')
      .select('invite_code')
      .eq('league_id', leagueId)
      .eq('email', normalizedEmail)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (inviteLookupError) {
      setError(inviteLookupError.message)
      return
    }

    const inviteCode = inviteRows?.[0]?.invite_code
    if (!inviteCode) {
      setError('No active invite found for this email.')
      return
    }

    const { error: acceptError } = await supabase.rpc('accept_league_invite', { p_invite_code: inviteCode })
    if (acceptError) {
      setError(acceptError.message)
      return
    }

    await setActiveLeague(leagueId)
    await refreshFromSupabase()
    setStatus('You have joined the league.')
    setTimeout(() => navigate('/leaderboard'), 700)
  }

  return (
    <section className="card">
      <div className="section-title">
        <h2>Sign Up</h2>
        <p>You've been invited to {leagueName}.</p>
        <p>Confirm your email to join</p>
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

      {step === 'signup' && (
        <form className="list-stack" onSubmit={(event) => void signUp(event)}>
          <label className="field-label">
            <span>League name</span>
            <input value={leagueName} readOnly />
          </label>
          <label className="field-label">
            <span>Password (optional)</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label className="field-label">
            <span>Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          <button className="btn-primary" disabled={!canSignUp} type="submit">
            Sign Up
          </button>
        </form>
      )}

      {error && <p className="error-text">{error}</p>}
      {status && <p className="success-text">{status}</p>}
    </section>
  )
}

