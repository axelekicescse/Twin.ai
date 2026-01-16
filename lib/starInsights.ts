import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import OpenAI from 'openai'
import { z } from 'zod'

import type { StarEvent } from '@/lib/starAnalytics'

export type InsightBucket = 'opportunity' | 'common_question'

export type InsightCard = {
  title: string
  topic_key: string
  bucket: InsightBucket
  count: number
  last_seen: string
  score: number
}

export type InsightSourceMessage = {
  id: string
  text: string
  ts: string
  conversationHref?: string | null
}

type StoredStarInsights = {
  cards: Record<string, InsightCard>
  sources: Record<string, InsightSourceMessage[]>
  processedMessageIds: string[]
}

type InsightsFileShapeV1 = {
  version: 1
  stars: Record<string, StoredStarInsights>
}

function insightsFilePath() {
  return path.join(process.cwd(), 'data', 'star-insights.json')
}

async function readInsightsFile(): Promise<InsightsFileShapeV1> {
  try {
    const raw = await fs.readFile(insightsFilePath(), 'utf8')
    const parsed = JSON.parse(raw) as any
    if (parsed?.version === 1 && parsed?.stars && typeof parsed.stars === 'object') {
      return parsed as InsightsFileShapeV1
    }
  } catch {
    // ignore
  }
  return { version: 1, stars: {} }
}

async function writeInsightsFile(data: InsightsFileShapeV1): Promise<void> {
  await fs.writeFile(insightsFilePath(), JSON.stringify(data, null, 2), 'utf8')
}

function messageId(ts: string, text: string): string {
  return crypto.createHash('sha1').update(`${ts}|${text}`).digest('hex')
}

function normalizeText(s: string): string {
  return String(s || '').trim().replace(/\s+/g, ' ')
}

function isEmojiOrPunctOnly(s: string): boolean {
  const t = normalizeText(s)
  if (!t) return true
  const stripped = t
    .replace(/[\p{L}\p{N}]+/gu, '')
    .replace(/[\s]+/g, '')
  return stripped.length === t.replace(/\s+/g, '').length
}

function isSmallTalk(s: string): boolean {
  const t = normalizeText(s).toLowerCase()
  if (!t) return true
  const greetings = [
    'hi',
    'hello',
    'hey',
    'yo',
    'sup',
    'good morning',
    'good afternoon',
    'good evening',
    'how are you',
    'hru',
    'lol',
    'lmao',
    'ok',
    'okay',
    'k',
    'thanks',
    'thank you',
    'thx',
    'nice',
    'cool',
    'love you',
  ]
  if (greetings.includes(t)) return true
  if (t.length <= 4) return true
  if (isEmojiOrPunctOnly(t)) return true
  return false
}

export function prefilterMessagesForInsights(
  events: StarEvent[],
  alreadyProcessedIds: Set<string>
): Array<{ id: string; text: string; ts: string }> {
  const out: Array<{ id: string; text: string; ts: string }> = []

  for (const e of events) {
    const text = normalizeText(e?.message || '')
    const ts = typeof e?.ts === 'string' ? e.ts : ''
    if (!text || !ts) continue

    const id = messageId(ts, text)
    if (alreadyProcessedIds.has(id)) continue

    if (text.length < 12) continue
    if (text.split(' ').filter(Boolean).length < 3) continue
    if (isSmallTalk(text)) continue

    out.push({ id, text, ts })
  }

  return out
}

const ClassificationItemSchema = z.object({
  message_id: z.string(),
  decision: z.enum(['opportunity', 'common_question', 'ignore']),
  topic_key: z.string().nullable(),
  title: z.string().nullable(),
  score: z.number().nullable(),
  confidence: z.number(),
})

const ClassificationResponseSchema = z.object({
  items: z.array(ClassificationItemSchema),
})

type ClassificationResponse = z.infer<typeof ClassificationResponseSchema>

type ExistingTopic = {
  topic_key: string
  title: string
  bucket: InsightBucket
  score: number
}

function isSnakeCaseKey(k: string): boolean {
  return /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(k)
}

function pickBetterTitle(oldTitle: string, newTitle: string): string {
  const a = normalizeText(oldTitle)
  const b = normalizeText(newTitle)
  if (!a) return b
  if (!b) return a
  if (b.length <= 45 && b.length < a.length) return b
  return a
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

async function classifyMessagesIntoInsights(
  messages: Array<{ id: string; text: string }>,
  existingTopicKeys: string[]
): Promise<ClassificationResponse> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const system =
    'You are an Insights engine for a creator analytics product. Your job is to group fan messages into meaningful, stable insight clusters. Output MUST be valid JSON only.'

  const user = {
    existing_topic_keys: existingTopicKeys,
    messages: messages.map((m) => ({ id: m.id, text: m.text })),
    task:
      'For each message, decide opportunity/common_question/ignore, assign a stable snake_case topic_key (reuse existing when possible), a short stable title (<=45 chars), a score 0..100, confidence 0..1. Ignore small talk, praise, emojis, greetings. Avoid duplicates: similar topics must share the same topic_key. Output JSON only.',
    output_schema: {
      items: [
        {
          message_id: 'string',
          decision: 'opportunity|common_question|ignore',
          topic_key: 'string|null',
          title: 'string|null',
          score: 'number|null',
          confidence: 'number',
        },
      ],
    },
  }

  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    temperature: 0.2,
    max_tokens: 1200,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(user) },
    ],
  })

  const content = resp.choices?.[0]?.message?.content || ''
  const parsed = JSON.parse(content)
  return ClassificationResponseSchema.parse(parsed)
}

export async function getStarInsightsSnapshot(starId: string) {
  const data = await readInsightsFile()
  const star = data.stars[starId]

  const cards: InsightCard[] = star
    ? Object.values(star.cards)
    : []

  const opportunity = cards
    .filter((c) => c.bucket === 'opportunity')
    .sort((a, b) => b.score - a.score || b.last_seen.localeCompare(a.last_seen))

  const commonQuestions = cards
    .filter((c) => c.bucket === 'common_question')
    .sort((a, b) => b.score - a.score || b.last_seen.localeCompare(a.last_seen))

  return {
    starId,
    cards: {
      opportunities: opportunity,
      commonQuestions,
    },
    processedCount: star?.processedMessageIds?.length || 0,
  }
}

export async function refreshStarInsightsIncremental(opts: {
  starId: string
  events: StarEvent[]
  maxNewToProcess?: number
}) {
  if (!process.env.OPENAI_API_KEY) {
    return { updated: false, error: 'OPENAI_API_KEY not configured' as const }
  }

  const starId = opts.starId
  const maxNewToProcess = typeof opts.maxNewToProcess === 'number' ? opts.maxNewToProcess : 120

  const file = await readInsightsFile()
  const star: StoredStarInsights = file.stars[starId] || {
    cards: {},
    sources: {},
    processedMessageIds: [],
  }

  const processed = new Set(star.processedMessageIds || [])

  const candidates = prefilterMessagesForInsights(opts.events, processed)
  const pending = candidates.length
  if (!pending) {
    return {
      updated: false,
      pending: 0,
      snapshot: await getStarInsightsSnapshot(starId),
    }
  }

  const toProcess = candidates.slice(-maxNewToProcess)

  const existingTopics: ExistingTopic[] = Object.values(star.cards || {}).map((c) => ({
    topic_key: c.topic_key,
    title: c.title,
    bucket: c.bucket,
    score: c.score,
  }))

  const existingKeys = Array.from(new Set(existingTopics.map((t) => t.topic_key))).slice(0, 500)

  let classified: ClassificationResponse
  try {
    classified = await classifyMessagesIntoInsights(
      toProcess.map((m) => ({ id: m.id, text: m.text })),
      existingKeys
    )
  } catch {
    return { updated: false, error: 'LLM_CLASSIFICATION_FAILED' as const }
  }

  const idToTs = new Map<string, string>()
  const idToText = new Map<string, string>()
  for (const m of toProcess) {
    idToTs.set(m.id, m.ts)
    idToText.set(m.id, m.text)
  }

  const validItems = classified.items.filter((it) => {
    if (it.decision === 'ignore') return true
    if (!it.topic_key || !it.title || typeof it.score !== 'number') return false
    if (!isSnakeCaseKey(it.topic_key)) return false
    return true
  })

  if (validItems.length !== classified.items.length) {
    return { updated: false, error: 'INVALID_LLM_OUTPUT' as const }
  }

  const groups = new Map<string, Array<(typeof validItems)[number]>>()
  for (const it of validItems) {
    if (it.decision === 'ignore') continue
    const bucket: InsightBucket = it.decision
    const k = `${bucket}::${it.topic_key}`
    const arr = groups.get(k) || []
    arr.push(it)
    groups.set(k, arr)
  }

  const nextCards = { ...(star.cards || {}) }
  const nextSources = { ...(star.sources || {}) }

  for (const [compound, arr] of groups.entries()) {
    const [bucket, topic_key] = compound.split('::') as [InsightBucket, string]
    const key = `${bucket}:${topic_key}`

    const prev = nextCards[key]
    const newCount = arr.length
    const lastSeen = arr
      .map((x) => idToTs.get(x.message_id) || '')
      .filter(Boolean)
      .sort()
      .slice(-1)[0]

    const bestScore = clampScore(
      Math.max(...arr.map((x) => (typeof x.score === 'number' ? x.score : 0)))
    )

    const bestTitleCandidate = arr
      .filter((x) => typeof x.title === 'string')
      .map((x) => x.title as string)[0]

    const bestConfidence = Math.max(...arr.map((x) => (Number.isFinite(x.confidence) ? x.confidence : 0)))

    const title = prev
      ? bestConfidence >= 0.85
        ? pickBetterTitle(prev.title, bestTitleCandidate)
        : prev.title
      : normalizeText(bestTitleCandidate).slice(0, 45)

    const score = prev
      ? clampScore(prev.score * 0.8 + bestScore * 0.2)
      : bestScore

    nextCards[key] = {
      title,
      topic_key,
      bucket,
      count: (prev?.count || 0) + newCount,
      last_seen: lastSeen || prev?.last_seen || new Date().toISOString(),
      score,
    }

    const existing = nextSources[key] || []
    const appended: InsightSourceMessage[] = arr
      .map((x) => {
        const ts = idToTs.get(x.message_id) || ''
        const text = idToText.get(x.message_id) || ''
        return {
          id: x.message_id,
          ts,
          text,
          conversationHref: null,
        }
      })
      .filter((m) => m.ts && m.text)

    const dedup = new Map<string, InsightSourceMessage>()
    for (const m of [...existing, ...appended]) dedup.set(m.id, m)

    const merged = Array.from(dedup.values())
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .slice(0, 200)

    nextSources[key] = merged
  }

  const processedNew = toProcess.map((m) => m.id)
  const processedMerged = Array.from(new Set([...(star.processedMessageIds || []), ...processedNew])).slice(-20000)

  const nextStar: StoredStarInsights = {
    cards: nextCards,
    sources: nextSources,
    processedMessageIds: processedMerged,
  }

  file.stars = { ...file.stars, [starId]: nextStar }

  try {
    await writeInsightsFile(file)
  } catch {
    return { updated: false, error: 'PERSIST_FAILED' as const }
  }

  return {
    updated: true,
    pending: Math.max(0, pending - toProcess.length),
    processed: processedNew.length,
    snapshot: await getStarInsightsSnapshot(starId),
  }
}

export async function getInsightSources(starId: string, bucket: InsightBucket, topic_key: string) {
  const data = await readInsightsFile()
  const star = data.stars[starId]
  const k = `${bucket}:${topic_key}`
  const sources = (star?.sources || {})[k] || []
  return {
    starId,
    bucket,
    topic_key,
    sources: sources.slice(0, 200),
  }
}
