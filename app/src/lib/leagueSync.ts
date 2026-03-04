import { isSupabaseConfigured, supabase } from './supabase'
import type { LeagueState, MatchRecord, Player } from '../types'

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

export async function getAuthedUserId(): Promise<string | null> {
  const client = requireSupabase()
  const { data, error } = await client.auth.getUser()
  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes('auth session missing') || message.includes('session')) {
      return null
    }
    throw error
  }
  return data.user?.id ?? null
}

export async function getAuthedUserEmail(): Promise<string | null> {
  const client = requireSupabase()
  const { data, error } = await client.auth.getUser()
  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes('auth session missing') || message.includes('session')) {
      return null
    }
    throw error
  }
  return data.user?.email?.toLowerCase() ?? null
}

export interface UserLeagueSummary {
  leagueId: string
  leagueName: string
  playerCount: number
}

export async function getLatestLeagueIdForUser(userId: string): Promise<string | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('league_members')
    .select('league_id, created_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return data?.[0]?.league_id ?? null
}

export async function listUserLeaguesWithCounts(userId: string): Promise<UserLeagueSummary[]> {
  const client = requireSupabase()

  const { data: memberships, error: membershipsError } = await client
    .from('league_members')
    .select('league_id')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (membershipsError) throw membershipsError

  const leagueIds = Array.from(new Set((memberships ?? []).map((row) => row.league_id))).filter(Boolean)
  if (leagueIds.length === 0) return []

  const { data: leaguesRows, error: leaguesError } = await client
    .from('leagues')
    .select('id, name')
    .in('id', leagueIds)

  if (leaguesError) throw leaguesError

  const { data: playerRows, error: playersError } = await client
    .from('players')
    .select('league_id')
    .in('league_id', leagueIds)

  if (playersError) throw playersError

  const playerCountByLeague = new Map<string, number>()
  for (const row of playerRows ?? []) {
    playerCountByLeague.set(row.league_id, (playerCountByLeague.get(row.league_id) ?? 0) + 1)
  }

  return (leaguesRows ?? [])
    .map((leagueRow) => ({
      leagueId: leagueRow.id,
      leagueName: leagueRow.name,
      playerCount: playerCountByLeague.get(leagueRow.id) ?? 0,
    }))
    .sort((a, b) => a.leagueName.localeCompare(b.leagueName))
}

export async function loadLeagueSnapshot(leagueId: string): Promise<LeagueState> {
  const client = requireSupabase()

  const { data: leagueRow, error: leagueError } = await client
    .from('leagues')
    .select('id, name')
    .eq('id', leagueId)
    .single()
  if (leagueError) throw leagueError

  const { data: playerRows, error: playersError } = await client
    .from('players')
    .select('id, display_name, created_at')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: true })
  if (playersError) throw playersError

  const { data: matchRows, error: matchesError } = await client
    .from('matches')
    .select('id, mode, winner_side, score_optional, created_at')
    .eq('league_id', leagueId)
    .eq('is_deleted', false)
    .is('superseded_by_match_id', null)
    .order('created_at', { ascending: true })
  if (matchesError) throw matchesError

  const matchIds = (matchRows ?? []).map((match) => match.id)
  let participantRows: { match_id: string; player_id: string; side: number; created_at: string }[] = []
  if (matchIds.length > 0) {
    const { data, error } = await client
      .from('match_participants')
      .select('match_id, player_id, side, created_at')
      .in('match_id', matchIds)
      .order('created_at', { ascending: true })
    if (error) throw error
    participantRows = data ?? []
  }

  const { data: invitesRows, error: invitesError } = await client
    .from('league_invites')
    .select('email')
    .eq('league_id', leagueId)
  if (invitesError) throw invitesError

  const players: Player[] = (playerRows ?? []).map((row) => ({
    id: row.id,
    name: row.display_name,
  }))

  const participantsByMatch = new Map<
    string,
    { team1: string[]; team2: string[] }
  >()
  for (const row of participantRows) {
    const current = participantsByMatch.get(row.match_id) ?? { team1: [], team2: [] }
    if (row.side === 1) current.team1.push(row.player_id)
    if (row.side === 2) current.team2.push(row.player_id)
    participantsByMatch.set(row.match_id, current)
  }

  const matches: MatchRecord[] = (matchRows ?? []).map((row) => {
    const participants = participantsByMatch.get(row.id) ?? { team1: [], team2: [] }
    const rawScore = row.score_optional as { display?: string } | string | null
    const optionalScore =
      typeof rawScore === 'string' ? rawScore : typeof rawScore?.display === 'string' ? rawScore.display : ''

    return {
      id: row.id,
      mode: row.mode,
      team1: participants.team1,
      team2: participants.team2,
      winnerSide: row.winner_side,
      optionalScore,
      createdAt: row.created_at,
    }
  })

  return {
    leagueName: leagueRow.name,
    members: Array.from(new Set((invitesRows ?? []).map((row) => row.email.toLowerCase()))),
    players,
    matches,
    activeLeagueId: leagueRow.id,
    isLeagueSaved: true,
  }
}

export async function createLeagueFromLocal(state: LeagueState, inviteEmails: string[]): Promise<string> {
  const client = requireSupabase()
  const userId = await getAuthedUserId()
  if (!userId) throw new Error('You must be signed in to save to Supabase.')

  const { data: insertedLeague, error: leagueError } = await client
    .from('leagues')
    .insert({
      name: state.leagueName,
      created_by_user_id: userId,
    })
    .select('id')
    .single()
  if (leagueError) throw leagueError
  const leagueId = insertedLeague.id

  const idMap = new Map<string, string>()
  for (const player of state.players) {
    const { data: row, error } = await client
      .from('players')
      .insert({
        league_id: leagueId,
        display_name: player.name,
      })
      .select('id')
      .single()
    if (error) throw error
    idMap.set(player.id, row.id)
  }

  const localMatches = [...state.matches].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  for (const match of localMatches) {
    const team1 = match.team1.map((id) => idMap.get(id)).filter(Boolean) as string[]
    const team2 = match.team2.map((id) => idMap.get(id)).filter(Boolean) as string[]
    if (team1.length === 0 || team2.length === 0) continue

    const { error } = await client.rpc('record_match', {
      p_league_id: leagueId,
      p_mode: match.mode,
      p_team1: team1,
      p_team2: team2,
      p_winner_side: match.winnerSide,
      p_score_optional: match.optionalScore ? { display: match.optionalScore } : null,
    })
    if (error) throw error
  }

  for (const email of inviteEmails.map((value) => value.trim().toLowerCase()).filter(Boolean)) {
    const { error } = await client.rpc('invite_member', {
      p_league_id: leagueId,
      p_email: email,
    })
    if (error && !error.message.toLowerCase().includes('duplicate')) {
      throw error
    }
  }

  return leagueId
}

export async function updateLeagueDetails(leagueId: string, leagueName: string, inviteEmails: string[]): Promise<void> {
  const client = requireSupabase()

  const { error: updateError } = await client.from('leagues').update({ name: leagueName }).eq('id', leagueId)
  if (updateError) throw updateError

  for (const email of inviteEmails.map((value) => value.trim().toLowerCase()).filter(Boolean)) {
    const { error } = await client.rpc('invite_member', {
      p_league_id: leagueId,
      p_email: email,
    })
    if (error && !error.message.toLowerCase().includes('duplicate')) {
      throw error
    }
  }
}

