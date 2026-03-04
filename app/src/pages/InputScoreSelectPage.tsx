import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { makeTeamsFromSelection, useLeague } from '../state/LeagueContext'
import type { MatchMode } from '../types'

export function InputScoreSelectPage() {
  const { league, setScoreDraft } = useLeague()
  const navigate = useNavigate()

  const [mode, setMode] = useState<MatchMode>('singles')
  const [selected, setSelected] = useState<string[]>([])
  const needed = mode === 'singles' ? 2 : 4

  const selectedNames = useMemo(
    () => selected.map((id) => league.players.find((player) => player.id === id)?.name).filter(Boolean),
    [league.players, selected],
  )

  const toggleSelect = (playerId: string) => {
    setSelected((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId)
      if (prev.length >= needed) return prev
      return [...prev, playerId]
    })
  }

  if (league.players.length < 2) {
    return (
      <section className="card">
        <h2>Input Score</h2>
        <p>Create a bracket first.</p>
        <button className="btn-primary" onClick={() => navigate('/create-bracket')}>
          Create Bracket
        </button>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="section-title">
        <h2>Input Score</h2>
        <p>Choose {needed} players</p>
      </div>

      <div className="toggle-wrap">
        <button
          className={mode === 'singles' ? 'toggle active' : 'toggle'}
          onClick={() => {
            setMode('singles')
            setSelected([])
          }}
        >
          Singles
        </button>
        <button
          className={mode === 'doubles' ? 'toggle active' : 'toggle'}
          onClick={() => {
            setMode('doubles')
            setSelected([])
          }}
        >
          Doubles
        </button>
      </div>

      <div className="player-grid">
        {league.players.map((player) => (
          <button
            key={player.id}
            className={selected.includes(player.id) ? 'chip active' : 'chip'}
            onClick={() => toggleSelect(player.id)}
            type="button"
          >
            {player.name}
          </button>
        ))}
      </div>

      <p className="hint">Players: {selectedNames.join(', ') || 'none'}</p>

      <div className="row-actions">
        <button className="btn-outline" onClick={() => navigate('/leaderboard')}>
          Back
        </button>
        <button
          className="btn-primary"
          disabled={selected.length !== needed}
          onClick={() => {
            if (selected.length !== needed) return
            const teams = makeTeamsFromSelection(mode, selected)
            setScoreDraft((prev) => ({
              ...prev,
              mode,
              selectedPlayerIds: selected,
              team1: teams.team1,
              team2: teams.team2,
              winnerSide: null,
              optionalScore: '',
            }))
            navigate('/input-score/result')
          }}
        >
          Next
        </button>
      </div>
    </section>
  )
}

