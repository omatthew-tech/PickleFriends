import type { LeaderboardEntry, MatchRecord, Player } from '../types'

interface SinglesRecommendation {
  kind: 'singles'
  playerA: Player
  playerB: Player
  eloDiff: number
}

interface DoublesRecommendation {
  kind: 'doubles'
  team1: [Player, Player]
  team2: [Player, Player]
  eloDiff: number
}

export type MatchRecommendation = SinglesRecommendation | DoublesRecommendation

function getLookbackByPlayerCount(count: number): number {
  return count <= 6 ? 1 : 2
}

function recentMatches(matches: MatchRecord[], lookback: number): MatchRecord[] {
  return matches.slice(-lookback)
}

function hasPlayedRecently(a: string, b: string, recent: MatchRecord[]): boolean {
  return recent.some((match) => {
    const participants = new Set([...match.team1, ...match.team2])
    return participants.has(a) && participants.has(b)
  })
}

function buildRecentEdges(matches: MatchRecord[]): Set<string> {
  const edges = new Set<string>()
  for (const match of matches) {
    const players = [...match.team1, ...match.team2]
    for (let i = 0; i < players.length; i += 1) {
      for (let j = i + 1; j < players.length; j += 1) {
        const key = [players[i], players[j]].sort().join('|')
        edges.add(key)
      }
    }
  }
  return edges
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

export function getSinglesRecommendations(
  players: Player[],
  leaderboard: LeaderboardEntry[],
  matches: MatchRecord[],
): MatchRecommendation[] {
  const ratings = new Map(leaderboard.map((entry) => [entry.playerId, entry.rating]))
  const lookback = getLookbackByPlayerCount(players.length)

  for (const currentLookback of [lookback, 1, 0]) {
    const recent = recentMatches(matches, currentLookback)
    const results: SinglesRecommendation[] = []

    for (let i = 0; i < players.length; i += 1) {
      for (let j = i + 1; j < players.length; j += 1) {
        const a = players[i]
        const b = players[j]
        if (currentLookback > 0 && hasPlayedRecently(a.id, b.id, recent)) continue

        const eloDiff = Math.abs((ratings.get(a.id) ?? 1000) - (ratings.get(b.id) ?? 1000))
        results.push({ kind: 'singles', playerA: a, playerB: b, eloDiff })
      }
    }

    if (results.length > 0 || currentLookback === 0) {
      return results.sort((a, b) => a.eloDiff - b.eloDiff).slice(0, 8)
    }
  }

  return []
}

export function getDoublesRecommendations(
  players: Player[],
  leaderboard: LeaderboardEntry[],
  matches: MatchRecord[],
): MatchRecommendation[] {
  if (players.length < 4) return []

  const ratings = new Map(leaderboard.map((entry) => [entry.playerId, entry.rating]))
  const lookback = getLookbackByPlayerCount(players.length)

  for (const currentLookback of [lookback, 1, 0]) {
    const edges = buildRecentEdges(recentMatches(matches, currentLookback))
    const seen = new Set<string>()
    const results: DoublesRecommendation[] = []

    for (let a = 0; a < players.length; a += 1) {
      for (let b = a + 1; b < players.length; b += 1) {
        const remaining = players.filter((_, idx) => idx !== a && idx !== b)
        for (let c = 0; c < remaining.length; c += 1) {
          for (let d = c + 1; d < remaining.length; d += 1) {
            const team1 = [players[a], players[b]] as [Player, Player]
            const team2 = [remaining[c], remaining[d]] as [Player, Player]

            const signature = [...team1.map((p) => p.id).sort(), 'vs', ...team2.map((p) => p.id).sort()]
              .sort()
              .join('|')
            if (seen.has(signature)) continue
            seen.add(signature)

            const allIds = [team1[0].id, team1[1].id, team2[0].id, team2[1].id]
            const hasRecentConflict =
              currentLookback > 0 &&
              allIds.some((id, i) =>
                allIds.slice(i + 1).some((other) => edges.has(pairKey(id, other))),
              )

            if (hasRecentConflict) continue

            const r1 = ((ratings.get(team1[0].id) ?? 1000) + (ratings.get(team1[1].id) ?? 1000)) / 2
            const r2 = ((ratings.get(team2[0].id) ?? 1000) + (ratings.get(team2[1].id) ?? 1000)) / 2
            results.push({ kind: 'doubles', team1, team2, eloDiff: Math.abs(r1 - r2) })
          }
        }
      }
    }

    if (results.length > 0 || currentLookback === 0) {
      return results.sort((x, y) => x.eloDiff - y.eloDiff).slice(0, 8)
    }
  }

  return []
}

