import type { Persona } from '@/lib/personas'

const KEY_TOKENS = 'twinai.tokens'
const KEY_RECENTS = 'twinai.recents'
const KEY_CHAT_PREFIX = 'twinai.chat.'

export type RecentChat = {
  id: string
  name: string
  lastMessage?: string
  updatedAt: number
}

export type StoredMessage = {
  role: 'user' | 'assistant'
  content: string
  imageDataUrl?: string
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function getTokenBalance(): number {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(KEY_TOKENS)
  const n = Number(raw)
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

export function setTokenBalance(value: number): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY_TOKENS, String(Math.max(0, Math.floor(value))))
}

export function addTokens(delta: number): number {
  const next = getTokenBalance() + Math.max(0, Math.floor(delta))
  setTokenBalance(next)
  return next
}

export function spendTokens(cost: number): { ok: boolean; balance: number } {
  const current = getTokenBalance()
  const c = Math.max(0, Math.floor(cost))
  if (current < c) return { ok: false, balance: current }
  const next = current - c
  setTokenBalance(next)
  return { ok: true, balance: next }
}

export function getRecentChats(): RecentChat[] {
  if (typeof window === 'undefined') return []
  const data = safeParseJson<RecentChat[]>(window.localStorage.getItem(KEY_RECENTS), [])
  return Array.isArray(data) ? data : []
}

export function upsertRecentChat(persona: Persona, lastMessage?: string): RecentChat[] {
  if (typeof window === 'undefined') return []

  const now = Date.now()
  const recents = getRecentChats()
  const existingIndex = recents.findIndex((r) => r.id === persona.id)
  const nextItem: RecentChat = {
    id: persona.id,
    name: persona.name,
    lastMessage: lastMessage?.slice(0, 120),
    updatedAt: now,
  }

  let next: RecentChat[]
  if (existingIndex >= 0) {
    next = [nextItem, ...recents.filter((r) => r.id !== persona.id)]
  } else {
    next = [nextItem, ...recents]
  }

  next = next.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12)
  window.localStorage.setItem(KEY_RECENTS, JSON.stringify(next))
  return next
}

export function loadChatHistory(personaId: string): StoredMessage[] {
  if (typeof window === 'undefined') return []
  const key = `${KEY_CHAT_PREFIX}${personaId}`
  const data = safeParseJson<StoredMessage[]>(window.localStorage.getItem(key), [])
  return Array.isArray(data) ? data : []
}

export function saveChatHistory(personaId: string, messages: StoredMessage[]): void {
  if (typeof window === 'undefined') return
  const key = `${KEY_CHAT_PREFIX}${personaId}`
  window.localStorage.setItem(key, JSON.stringify(messages.slice(-60)))
}
