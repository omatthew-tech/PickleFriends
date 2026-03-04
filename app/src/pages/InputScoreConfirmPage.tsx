import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../state/LeagueContext'

export function InputScoreConfirmPage() {
  const { league, scoreDraft, recordMatch, resetDraft, syncError } = useLeague()
  const navigate = useNavigate()
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const winnerSide = scoreDraft.winnerSide

  const team1Names = useMemo(
    () =>
      scoreDraft.team1
        .map((id) => league.players.find((player) => player.id === id)?.name)
        .filter(Boolean)
        .join(' & '),
    [league.players, scoreDraft.team1],
  )
  const team2Names = useMemo(
    () =>
      scoreDraft.team2
        .map((id) => league.players.find((player) => player.id === id)?.name)
        .filter(Boolean)
        .join(' & '),
    [league.players, scoreDraft.team2],
  )

  if (winnerSide === null) {
    return (
      <section className="card">
        <h2>Confirm Score</h2>
        <p>Winner is missing. Please complete the prior step.</p>
        <button className="btn-primary" onClick={() => navigate('/input-score/result')}>
          Back
        </button>
      </section>
    )
  }

  const winner = winnerSide === 1 ? team1Names : team2Names

  return (
    <section className="card">
      <div className="section-title">
        <h2>Confirm Score</h2>
        <p>Review details before recording the result.</p>
      </div>

      {!confirmed ? (
        <>
          <div className="summary">
            <p>
              <strong>Mode:</strong> {scoreDraft.mode}
            </p>
            <p>
              <strong>Match:</strong> {team1Names} vs {team2Names}
            </p>
            <p>
              <strong>Winner:</strong> {winner}
            </p>
            <p>
              <strong>Optional score:</strong> {scoreDraft.optionalScore || 'Not provided'}
            </p>
          </div>
          <div className="row-actions">
            <button className="btn-outline" onClick={() => navigate('/input-score/result')}>
              Back
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                void (async () => {
                  setError('')
                  try {
                    await recordMatch({
                      mode: scoreDraft.mode,
                      team1: scoreDraft.team1,
                      team2: scoreDraft.team2,
                      winnerSide,
                      optionalScore: scoreDraft.optionalScore.trim(),
                    })
                    setConfirmed(true)
                    setTimeout(() => {
                      resetDraft()
                      navigate('/leaderboard')
                    }, 1400)
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to record score.')
                  }
                })()
              }}
            >
              Confirm
            </button>
          </div>
        </>
      ) : (
        <div className="success-wrap">
          <div className="checkmark">✓</div>
          <p>The score has been successfully recorded.</p>
        </div>
      )}
      {(error || syncError) && <p className="error-text">{error || syncError}</p>}
    </section>
  )
}

