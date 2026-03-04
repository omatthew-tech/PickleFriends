import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDoublesRecommendations, getSinglesRecommendations } from '../domain/recommendations'
import { useLeague } from '../state/LeagueContext'
import type { MatchMode } from '../types'

export function RecommendedMatchesPage() {
  const { league, leaderboard } = useLeague()
  const navigate = useNavigate()
  const [mode, setMode] = useState<MatchMode>('singles')

  const recommendations = useMemo(() => {
    if (mode === 'singles') return getSinglesRecommendations(league.players, leaderboard, league.matches)
    return getDoublesRecommendations(league.players, leaderboard, league.matches)
  }, [league.players, leaderboard, league.matches, mode])

  return (
    <section className="card">
      <div className="section-title">
        <h2>Recommended Matches</h2>
        <p>Optimized for close ELO and avoids immediate rematches.</p>
      </div>

      <div className="toggle-wrap">
        <button className={mode === 'singles' ? 'toggle active' : 'toggle'} onClick={() => setMode('singles')}>
          Singles
        </button>
        <button className={mode === 'doubles' ? 'toggle active' : 'toggle'} onClick={() => setMode('doubles')}>
          Doubles
        </button>
      </div>

      {recommendations.length === 0 ? (
        <p className="empty">No recommendations yet. Add more players or record more games.</p>
      ) : (
        <div className="list-stack">
          {recommendations.map((rec, idx) => (
            <div key={`${rec.kind}-${idx}`} className="match-card">
              <strong>#{idx + 1}</strong>
              {rec.kind === 'singles' ? (
                <p>
                  {rec.playerA.name} <strong>vs</strong> {rec.playerB.name}
                </p>
              ) : (
                <p>
                  {rec.team1[0].name} & {rec.team1[1].name} <strong>vs</strong> {rec.team2[0].name} & {rec.team2[1].name}
                </p>
              )}
              <small>ELO delta: {Math.round(rec.eloDiff)}</small>
            </div>
          ))}
        </div>
      )}

      <div className="row-actions">
        <button className="btn-outline" onClick={() => navigate('/leaderboard')}>
          Back
        </button>
      </div>
    </section>
  )
}

