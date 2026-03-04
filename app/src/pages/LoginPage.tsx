import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useLeague } from '../state/LeagueContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { refreshFromSupabase } = useLeague()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setError('')
    setStatus('')

    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured.')
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(signInError.message)
      return
    }

    await refreshFromSupabase()
    setStatus('Logged in successfully.')
    setTimeout(() => navigate('/leaderboard'), 700)
  }

  return (
    <section className="card">
      <div className="section-title">
        <h2>Log In</h2>
        <p>Log in with your email and password or with a special link</p>
      </div>

      <form className="list-stack" onSubmit={(event) => void submit(event)}>
        <label className="field-label">
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </label>

        <label className="field-label">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>

        <button className="btn-primary" type="submit">
          Log In
        </button>

        <button className="link-like-btn" type="button">
          login with a special link instead
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}
      {status && <p className="success-text">{status}</p>}
    </section>
  )
}

