import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../state/LeagueContext'

function defaultPlayers(): string[] {
  return ['Player 1', 'Player 2']
}

export function CreateBracketPage() {
  const navigate = useNavigate()
  const { league, setPlayers } = useLeague()
  const hasBracket = league.players.length >= 2
  const [playerNames, setPlayerNames] = useState<string[]>(
    league.players.length > 0 ? league.players.map((player) => player.name) : defaultPlayers(),
  )

  const canContinue = useMemo(() => playerNames.map((name) => name.trim()).filter(Boolean).length >= 2, [playerNames])

  const updateName = (index: number, value: string) => {
    setPlayerNames((prev) => prev.map((name, idx) => (idx === index ? value : name)))
  }

  const removePlayer = (index: number) => {
    setPlayerNames((prev) => prev.filter((_, idx) => idx !== index))
  }

  return (
    <section className="card">
      <div className="section-title">
        <h2>{hasBracket ? 'Add Additional Players' : 'Create Bracket'}</h2>
        <p>{hasBracket ? 'Add as many players as you want' : 'Start with two players, then add as many as you want.'}</p>
      </div>

      <div className="list-stack">
        {playerNames.map((name, idx) => (
          <label className="player-row" key={`player-input-${idx}`}>
            <span>Player {idx + 1}</span>
            <div className="player-input-row">
              <input value={name} onChange={(event) => updateName(idx, event.target.value)} />
              {idx >= 2 && (
                <button
                  className="remove-player-btn"
                  type="button"
                  onClick={() => removePlayer(idx)}
                  aria-label={`Remove player ${idx + 1}`}
                  title={`Remove player ${idx + 1}`}
                >
                  X
                </button>
              )}
            </div>
          </label>
        ))}
      </div>

      <div className="row-actions">
        <button
          className="btn-outline"
          onClick={() => setPlayerNames((prev) => [...prev, `Player ${prev.length + 1}`])}
          type="button"
        >
          Add Player
        </button>
        <button
          className="btn-primary"
          disabled={!canContinue}
          onClick={() => {
            if (!canContinue) return
            setPlayers(playerNames)
            navigate('/leaderboard')
          }}
          type="button"
        >
          Continue
        </button>
      </div>
    </section>
  )
}

