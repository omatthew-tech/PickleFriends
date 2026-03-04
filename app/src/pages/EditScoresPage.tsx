import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../state/LeagueContext'

export function EditScoresPage() {
  const { league, updateMatch, deleteMatch, syncError } = useLeague()
  const navigate = useNavigate()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [winnerSide, setWinnerSide] = useState<1 | 2>(1)
  const [optionalScore, setOptionalScore] = useState('')
  const [error, setError] = useState('')

  const startEdit = (matchId: string) => {
    const target = league.matches.find((match) => match.id === matchId)
    if (!target) return
    setEditingId(matchId)
    setWinnerSide(target.winnerSide)
    setOptionalScore(target.optionalScore)
  }

  const playerName = (id: string): string => league.players.find((p) => p.id === id)?.name ?? 'Unknown'

  return (
    <section className="card">
      <div className="section-title">
        <h2>Edit Scores</h2>
        <p>Edit or delete past match results. Leaderboard updates automatically.</p>
      </div>

      {league.matches.length === 0 ? (
        <p className="empty">No scores recorded yet.</p>
      ) : (
        <div className="list-stack">
          {[...league.matches]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((match) => {
              const t1 = match.team1.map(playerName).join(' & ')
              const t2 = match.team2.map(playerName).join(' & ')
              const isEditing = editingId === match.id
              return (
                <article className="match-card" key={match.id}>
                  <div className="match-card-head">
                    <div className="match-card-copy">
                      <p>
                        <strong>{t1}</strong> vs <strong>{t2}</strong>
                      </p>
                      <small>
                        {match.mode} • {new Date(match.createdAt).toLocaleString()}
                      </small>
                    </div>
                    {!isEditing && (
                      <div className="icon-actions inline">
                        <button className="icon-btn" onClick={() => startEdit(match.id)} type="button" title="Edit score">
                          ✏️
                        </button>
                        <button
                          className="icon-btn danger"
                          onClick={() => {
                            const confirmed = window.confirm('Delete this match score?')
                            if (confirmed) {
                              void (async () => {
                                setError('')
                                try {
                                  await deleteMatch(match.id)
                                } catch (e) {
                                  setError(e instanceof Error ? e.message : 'Failed to delete score.')
                                }
                              })()
                            }
                          }}
                          type="button"
                          title="Delete score"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="edit-panel">
                      <div className="toggle-wrap">
                        <button
                          className={winnerSide === 1 ? 'toggle active' : 'toggle'}
                          onClick={() => setWinnerSide(1)}
                          type="button"
                        >
                          Winner: Team 1
                        </button>
                        <button
                          className={winnerSide === 2 ? 'toggle active' : 'toggle'}
                          onClick={() => setWinnerSide(2)}
                          type="button"
                        >
                          Winner: Team 2
                        </button>
                      </div>
                      <input
                        placeholder="Optional score"
                        value={optionalScore}
                        onChange={(event) => setOptionalScore(event.target.value)}
                      />
                      <div className="row-actions">
                        <button className="btn-outline" onClick={() => setEditingId(null)} type="button">
                          Cancel
                        </button>
                        <button
                          className="btn-primary"
                          onClick={() => {
                            void (async () => {
                              setError('')
                              try {
                                await updateMatch(match.id, { winnerSide, optionalScore: optionalScore.trim() })
                                setEditingId(null)
                              } catch (e) {
                                setError(e instanceof Error ? e.message : 'Failed to update score.')
                              }
                            })()
                          }}
                          type="button"
                        >
                          Save Edit
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              )
            })}
        </div>
      )}

      <div className="row-actions">
        <button className="btn-outline" onClick={() => navigate('/leaderboard')}>
          Back
        </button>
      </div>
      {(error || syncError) && <p className="error-text">{error || syncError}</p>}
    </section>
  )
}

