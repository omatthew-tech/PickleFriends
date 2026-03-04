export type MatchMode = 'singles' | 'doubles'

export interface Player {
  id: string
  name: string
}

export interface MatchRecord {
  id: string
  mode: MatchMode
  team1: string[]
  team2: string[]
  winnerSide: 1 | 2
  optionalScore: string
  createdAt: string
}

export interface LeagueState {
  leagueName: string
  members: string[]
  players: Player[]
  matches: MatchRecord[]
  activeLeagueId?: string | null
  isLeagueSaved?: boolean
}

export interface LeaderboardEntry {
  playerId: string
  playerName: string
  rating: number
  gamesPlayed: number
  wins: number
}

export interface ScoreDraft {
  mode: MatchMode
  selectedPlayerIds: string[]
  team1: string[]
  team2: string[]
  winnerSide: 1 | 2 | null
  optionalScore: string
}

