import { useNavigate } from 'react-router-dom'
import { useLeague } from '../state/LeagueContext'

export function LeaderboardPage() {
  const { league, leaderboard } = useLeague()
  const navigate = useNavigate()

  if (league.players.length < 2) {
    return (
      <section className="card">
        <h2>Leaderboard</h2>
        <p>You need at least two players before the leaderboard can start.</p>
        <button className="btn-primary" onClick={() => navigate('/create-bracket')}>
          Create Bracket
        </button>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="section-title">
        <h2>{league.leagueName} Leaderboard</h2>
        <p>{league.matches.length} matches recorded</p>
      </div>

      <div className="leaderboard-list">
        {leaderboard.map((entry, index) => (
          <div key={entry.playerId} className="leaderboard-row">
            <div className="rank">#{index + 1}</div>
            <div className="leaderboard-player">
              <strong>{entry.playerName}</strong>
              <small>
                {entry.wins} {entry.wins === 1 ? 'win' : 'wins'} / {entry.gamesPlayed}{' '}
                {entry.gamesPlayed === 1 ? 'game' : 'games'}
              </small>
            </div>
            <div className="rating-badge">{entry.rating}</div>
          </div>
        ))}
      </div>

      <div className="cta-grid">
        <button className="btn-secondary" onClick={() => navigate('/recommended')}>
          Recommended Matchups
        </button>
        <button className="btn-primary" onClick={() => navigate('/input-score/select')}>
          Input Score
        </button>
        <button className="btn-outline" onClick={() => navigate('/edit-scores')}>
          Edit Scores
        </button>
        <button className="btn-outline" onClick={() => navigate('/create-bracket')}>
          Add Players
        </button>
      </div>
    </section>
  )
}

