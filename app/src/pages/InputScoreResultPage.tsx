import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../state/LeagueContext'

export function InputScoreResultPage() {
  const { league, scoreDraft, setScoreDraft } = useLeague()
  const navigate = useNavigate()

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

  if (scoreDraft.team1.length === 0 || scoreDraft.team2.length === 0) {
    return (
      <section className="card">
        <h2>Input Score</h2>
        <p>Select participants first.</p>
        <button className="btn-primary" onClick={() => navigate('/input-score/select')}>
          Back to Selection
        </button>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="section-title">
        <h2>Input Score - Pick Winner</h2>
        <p>Choose who won, then optionally add score details.</p>
      </div>

      <div className="list-stack">
        <button
          className={scoreDraft.winnerSide === 1 ? 'team-btn active' : 'team-btn'}
          onClick={() => setScoreDraft((prev) => ({ ...prev, winnerSide: 1 }))}
          type="button"
        >
          <span className="team-btn-content">
            <span>{team1Names}</span>
            {scoreDraft.winnerSide === 1 && <span className="winner-badge">Winner</span>}
          </span>
        </button>
        <button
          className={scoreDraft.winnerSide === 2 ? 'team-btn active' : 'team-btn'}
          onClick={() => setScoreDraft((prev) => ({ ...prev, winnerSide: 2 }))}
          type="button"
        >
          <span className="team-btn-content">
            <span>{team2Names}</span>
            {scoreDraft.winnerSide === 2 && <span className="winner-badge">Winner</span>}
          </span>
        </button>
      </div>

      <label className="field-label">
        <span>Optional score details</span>
        <input
          placeholder="e.g. 11-8, 11-9"
          value={scoreDraft.optionalScore}
          onChange={(event) => setScoreDraft((prev) => ({ ...prev, optionalScore: event.target.value }))}
        />
      </label>

      <div className="row-actions">
        <button className="btn-outline" onClick={() => navigate('/input-score/select')}>
          Back
        </button>
        <button
          className="btn-primary"
          disabled={scoreDraft.winnerSide === null}
          onClick={() => navigate('/input-score/confirm')}
        >
          Next
        </button>
      </div>
    </section>
  )
}

