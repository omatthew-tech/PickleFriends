import type { LeaderboardEntry, MatchRecord, Player } from '../types'

const START_RATING = 1000
const K_FACTOR = 24

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

export function buildLeaderboard(players: Player[], matches: MatchRecord[]): LeaderboardEntry[] {
  const ratings = new Map<string, number>()
  const wins = new Map<string, number>()
  const games = new Map<string, number>()

  for (const player of players) {
    ratings.set(player.id, START_RATING)
    wins.set(player.id, 0)
    games.set(player.id, 0)
  }

  const orderedMatches = [...matches].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  for (const match of orderedMatches) {
    const team1Rating =
      match.team1.reduce((sum, id) => sum + (ratings.get(id) ?? START_RATING), 0) / match.team1.length
    const team2Rating =
      match.team2.reduce((sum, id) => sum + (ratings.get(id) ?? START_RATING), 0) / match.team2.length

    const expected1 = expectedScore(team1Rating, team2Rating)
    const actual1 = match.winnerSide === 1 ? 1 : 0
    const delta1 = Math.round(K_FACTOR * (actual1 - expected1))
    const delta2 = -delta1

    for (const id of match.team1) {
      ratings.set(id, (ratings.get(id) ?? START_RATING) + delta1)
      games.set(id, (games.get(id) ?? 0) + 1)
      if (match.winnerSide === 1) wins.set(id, (wins.get(id) ?? 0) + 1)
    }

    for (const id of match.team2) {
      ratings.set(id, (ratings.get(id) ?? START_RATING) + delta2)
      games.set(id, (games.get(id) ?? 0) + 1)
      if (match.winnerSide === 2) wins.set(id, (wins.get(id) ?? 0) + 1)
    }
  }

  return players
    .map((player) => ({
      playerId: player.id,
      playerName: player.name,
      rating: ratings.get(player.id) ?? START_RATING,
      gamesPlayed: games.get(player.id) ?? 0,
      wins: wins.get(player.id) ?? 0,
    }))
    .sort((a, b) => b.rating - a.rating || a.playerName.localeCompare(b.playerName))
}

