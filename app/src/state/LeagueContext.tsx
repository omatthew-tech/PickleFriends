import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { buildLeaderboard } from '../domain/elo'
import type { LeagueState, MatchMode, MatchRecord, ScoreDraft } from '../types'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  createLeagueFromLocal,
  getAuthedUserId,
  getLatestLeagueIdForUser,
  loadLeagueSnapshot,
  updateLeagueDetails,
} from '../lib/leagueSync'

const STORAGE_KEY = 'picklefast.v1'

const defaultLeague: LeagueState = {
  leagueName: 'My League',
  members: [],
  players: [],
  matches: [],
  activeLeagueId: null,
  isLeagueSaved: false,
}

const defaultDraft: ScoreDraft = {
  mode: 'singles',
  selectedPlayerIds: [],
  team1: [],
  team2: [],
  winnerSide: null,
  optionalScore: '',
}

interface LeagueContextValue {
  league: LeagueState
  leaderboard: ReturnType<typeof buildLeaderboard>
  syncError: string | null
  scoreDraft: ScoreDraft
  setScoreDraft: (updater: (draft: ScoreDraft) => ScoreDraft) => void
  setPlayers: (names: string[]) => void
  recordMatch: (record: Omit<MatchRecord, 'id' | 'createdAt'>) => Promise<void>
  updateMatch: (matchId: string, patch: Partial<Omit<MatchRecord, 'id' | 'createdAt'>>) => Promise<void>
  deleteMatch: (matchId: string) => Promise<void>
  saveLeagueDetails: (leagueName: string, emailsToInvite: string[]) => Promise<void>
  refreshFromSupabase: () => Promise<void>
  setActiveLeague: (leagueId: string) => Promise<void>
  resetDraft: () => void
}

const LeagueContext = createContext<LeagueContextValue | null>(null)

function safeLoad(): LeagueState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultLeague
    const parsed = JSON.parse(raw) as LeagueState
    return {
      ...defaultLeague,
      ...parsed,
      members: parsed.members ?? [],
      players: parsed.players ?? [],
      matches: parsed.matches ?? [],
      activeLeagueId: parsed.activeLeagueId ?? null,
      isLeagueSaved: parsed.isLeagueSaved ?? Boolean(parsed.activeLeagueId),
    }
  } catch {
    return defaultLeague
  }
}

function persist(state: LeagueState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function id(): string {
  return Math.random().toString(36).slice(2, 11)
}

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [league, setLeague] = useState<LeagueState>(() => safeLoad())
  const [scoreDraft, setScoreDraftState] = useState<ScoreDraft>(defaultDraft)
  const [syncError, setSyncError] = useState<string | null>(null)

  const leaderboard = useMemo(() => buildLeaderboard(league.players, league.matches), [league.players, league.matches])

  const setLeagueAndPersist = (updater: (prev: LeagueState) => LeagueState) => {
    setLeague((prev) => {
      const next = updater(prev)
      persist(next)
      return next
    })
  }

  const refreshFromSupabase = async () => {
    if (!isSupabaseConfigured || !supabase) return
    const userId = await getAuthedUserId()
    if (!userId) return

    const targetLeagueId = league.activeLeagueId ?? (await getLatestLeagueIdForUser(userId))
    if (!targetLeagueId) return

    const snapshot = await loadLeagueSnapshot(targetLeagueId)
    setLeagueAndPersist(() => snapshot)
    setSyncError(null)
  }

  const setActiveLeague = async (leagueId: string) => {
    if (!leagueId) return

    if (!isSupabaseConfigured || !supabase) {
      setLeagueAndPersist((prev) => ({ ...prev, activeLeagueId: leagueId, isLeagueSaved: true }))
      return
    }

    const snapshot = await loadLeagueSnapshot(leagueId)
    setLeagueAndPersist(() => ({ ...snapshot, activeLeagueId: leagueId, isLeagueSaved: true }))
    setSyncError(null)
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    let cancelled = false
    void (async () => {
      try {
        const userId = await getAuthedUserId()
        if (!userId || cancelled) return
        const targetLeagueId = league.activeLeagueId ?? (await getLatestLeagueIdForUser(userId))
        if (!targetLeagueId || cancelled) return
        const snapshot = await loadLeagueSnapshot(targetLeagueId)
        if (!cancelled) {
          setLeagueAndPersist(() => snapshot)
          setSyncError(null)
        }
      } catch (error) {
        if (!cancelled) setSyncError(error instanceof Error ? error.message : 'Supabase sync failed.')
      }
    })()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return
      void (async () => {
        try {
          const targetLeagueId = league.activeLeagueId ?? (await getLatestLeagueIdForUser(session.user.id))
          if (!targetLeagueId) return
          const snapshot = await loadLeagueSnapshot(targetLeagueId)
          if (!cancelled) {
            setLeagueAndPersist(() => snapshot)
            setSyncError(null)
          }
        } catch (error) {
          if (!cancelled) setSyncError(error instanceof Error ? error.message : 'Supabase sync failed.')
        }
      })()
    })

    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  const value: LeagueContextValue = {
    league,
    leaderboard,
    syncError,
    scoreDraft,
    setScoreDraft: (updater) => setScoreDraftState((prev) => updater(prev)),
    setPlayers: (names) => {
      const uniqueNames = names.map((n) => n.trim()).filter(Boolean)
      setLeagueAndPersist((prev) => ({
        ...prev,
        players: uniqueNames.map((name) => ({ id: id(), name })),
        matches: [],
        members: [],
        activeLeagueId: null,
        isLeagueSaved: false,
      }))
    },
    recordMatch: async (record) => {
      if (isSupabaseConfigured && supabase && league.activeLeagueId) {
        const { error } = await supabase.rpc('record_match', {
          p_league_id: league.activeLeagueId,
          p_mode: record.mode,
          p_team1: record.team1,
          p_team2: record.team2,
          p_winner_side: record.winnerSide,
          p_score_optional: record.optionalScore ? { display: record.optionalScore } : null,
        })
        if (error) {
          setSyncError(error.message)
          throw new Error(error.message)
        }
        await refreshFromSupabase()
        return
      }

      setLeagueAndPersist((prev) => ({
        ...prev,
        matches: [
          ...prev.matches,
          {
            id: id(),
            createdAt: new Date().toISOString(),
            ...record,
          },
        ],
      }))
      setSyncError(null)
    },
    updateMatch: async (matchId, patch) => {
      if (isSupabaseConfigured && supabase && league.activeLeagueId) {
        const match = league.matches.find((m) => m.id === matchId)
        if (!match) throw new Error('Match not found.')

        const merged = { ...match, ...patch }
        const { error } = await supabase.rpc('edit_match', {
          p_match_id: matchId,
          p_mode: merged.mode,
          p_team1: merged.team1,
          p_team2: merged.team2,
          p_winner_side: merged.winnerSide,
          p_score_optional: merged.optionalScore ? { display: merged.optionalScore } : null,
        })
        if (error) {
          setSyncError(error.message)
          throw new Error(error.message)
        }
        await refreshFromSupabase()
        return
      }

      setLeagueAndPersist((prev) => ({
        ...prev,
        matches: prev.matches.map((match) => (match.id === matchId ? { ...match, ...patch } : match)),
      }))
      setSyncError(null)
    },
    deleteMatch: async (matchId) => {
      if (isSupabaseConfigured && supabase && league.activeLeagueId) {
        const { error } = await supabase.rpc('delete_match', { p_match_id: matchId })
        if (error) {
          setSyncError(error.message)
          throw new Error(error.message)
        }
        await refreshFromSupabase()
        return
      }

      setLeagueAndPersist((prev) => ({
        ...prev,
        matches: prev.matches.filter((match) => match.id !== matchId),
      }))
      setSyncError(null)
    },
    saveLeagueDetails: async (leagueName, emailsToInvite) => {
      const normalizedLeagueName = leagueName.trim() || league.leagueName
      const normalizedEmails = Array.from(
        new Set([...league.members, ...emailsToInvite.map((email) => email.trim().toLowerCase())].filter(Boolean)),
      )

      if (!isSupabaseConfigured || !supabase) {
        setLeagueAndPersist((prev) => ({
          ...prev,
          leagueName: normalizedLeagueName,
          members: normalizedEmails,
          isLeagueSaved: true,
        }))
        setSyncError(null)
        return
      }

      const userId = await getAuthedUserId()
      if (!userId) {
        const message = 'You must be authenticated to save league data to Supabase.'
        setSyncError(message)
        throw new Error(message)
      }

      if (league.activeLeagueId) {
        await updateLeagueDetails(league.activeLeagueId, normalizedLeagueName, normalizedEmails)
      } else {
        const currentLeagueForSync: LeagueState = {
          ...league,
          leagueName: normalizedLeagueName,
          members: normalizedEmails,
        }
        const newLeagueId = await createLeagueFromLocal(currentLeagueForSync, normalizedEmails)
        setLeagueAndPersist((prev) => ({ ...prev, activeLeagueId: newLeagueId }))
      }

      await refreshFromSupabase()
      setLeagueAndPersist((prev) => ({ ...prev, isLeagueSaved: true }))
      setSyncError(null)
    },
    refreshFromSupabase,
    setActiveLeague,
    resetDraft: () => setScoreDraftState(defaultDraft),
  }

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>
}

export function useLeague(): LeagueContextValue {
  const ctx = useContext(LeagueContext)
  if (!ctx) throw new Error('useLeague must be used inside LeagueProvider')
  return ctx
}

export function makeTeamsFromSelection(mode: MatchMode, selected: string[]): Pick<ScoreDraft, 'team1' | 'team2'> {
  if (mode === 'singles') {
    return { team1: selected.slice(0, 1), team2: selected.slice(1, 2) }
  }

  return { team1: selected.slice(0, 2), team2: selected.slice(2, 4) }
}

