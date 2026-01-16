import fs from 'fs/promises'
import path from 'path'

export type FanMeta = {
  email?: string
  gender?: string
  country?: string
}

export type StarEvent = {
  ts: string
  message: string
  tokensSpent?: number
  fan?: FanMeta
}

type StarBucketV2 = {
  events: StarEvent[]
  questions: Record<string, number>
  lastMessage?: { ts: string; message: string }
  totals?: { tokensSpent?: number }
  fan?: {
    gender?: Record<string, number>
    country?: Record<string, number>
    uniqueEmails?: string[]
  }
}

type FileShapeV2 = {
  version: 2
  stars: Record<string, StarBucketV2>
}

function filePath() {
  return path.join(process.cwd(), 'data', 'star-analytics.json')
}

async function readFile(): Promise<FileShapeV2> {
  const raw = await fs.readFile(filePath(), 'utf8')
  const parsed = JSON.parse(raw) as any

  if (parsed?.version === 2 && parsed?.stars) return parsed as FileShapeV2

  const legacyStars = parsed?.stars && typeof parsed.stars === 'object' ? parsed.stars : {}
  const stars: Record<string, StarBucketV2> = {}
  for (const [starId, bucket] of Object.entries(legacyStars)) {
    const questions = (bucket && typeof bucket === 'object' ? (bucket as any) : {}) as Record<string, number>
    stars[starId] = { events: [], questions }
  }

  const upgraded: FileShapeV2 = { version: 2, stars }
  try {
    await writeFile(upgraded)
  } catch {
    // ignore
  }
  return upgraded
}

async function writeFile(data: FileShapeV2): Promise<void> {
  await fs.writeFile(filePath(), JSON.stringify(data, null, 2), 'utf8')
}

function normalizeQuestion(q: string): string {
  return (q || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90)
}

export async function trackFanQuestion(starId: string, question: string): Promise<void> {
  await trackFanEvent(starId, { ts: new Date().toISOString(), message: question })
}

export async function trackFanEvent(
  starId: string,
  event: { ts?: string; message: string; tokensSpent?: number; fan?: FanMeta }
): Promise<void> {
  const message = String(event.message || '').trim()
  if (!message) return
  const ts = event.ts || new Date().toISOString()

  const key = normalizeQuestion(message)
  if (!key) return

  try {
    const data = (await readFile()) as FileShapeV2
    const bucket: StarBucketV2 = data.stars?.[starId] || { events: [], questions: {} }

    const tokens = typeof event.tokensSpent === 'number' ? event.tokensSpent : 0

    bucket.events = Array.isArray(bucket.events) ? bucket.events : []
    bucket.questions = bucket.questions && typeof bucket.questions === 'object' ? bucket.questions : {}
    bucket.totals = bucket.totals || {}
    bucket.fan = bucket.fan || {}

    bucket.lastMessage = { ts, message }
    bucket.questions[key] = (bucket.questions[key] || 0) + 1
    bucket.totals.tokensSpent = (bucket.totals.tokensSpent || 0) + tokens

    const fan = event.fan || {}
    const gender = (fan.gender || '').trim()
    const country = (fan.country || '').trim()
    const email = (fan.email || '').trim().toLowerCase()

    if (gender) {
      bucket.fan.gender = bucket.fan.gender || {}
      bucket.fan.gender[gender] = (bucket.fan.gender[gender] || 0) + 1
    }
    if (country) {
      bucket.fan.country = bucket.fan.country || {}
      bucket.fan.country[country] = (bucket.fan.country[country] || 0) + 1
    }
    if (email) {
      bucket.fan.uniqueEmails = Array.isArray(bucket.fan.uniqueEmails) ? bucket.fan.uniqueEmails : []
      if (!bucket.fan.uniqueEmails.includes(email)) bucket.fan.uniqueEmails.push(email)
      if (bucket.fan.uniqueEmails.length > 5000) bucket.fan.uniqueEmails = bucket.fan.uniqueEmails.slice(-5000)
    }

    bucket.events.push({ ts, message, tokensSpent: tokens || undefined, fan: Object.keys(fan).length ? fan : undefined })
    if (bucket.events.length > 3000) bucket.events = bucket.events.slice(-3000)

    const entries = Object.entries(bucket.questions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 120)
    bucket.questions = Object.fromEntries(entries)

    data.stars = { ...data.stars, [starId]: bucket }
    await writeFile(data)
  } catch {
    // best-effort
  }
}

export async function getTopQuestions(starId: string): Promise<Array<{ question: string; count: number }>> {
  try {
    const data = (await readFile()) as FileShapeV2
    const bucket = data.stars?.[starId]
    const questions = bucket?.questions || {}
    return Object.entries(questions)
      .map(([question, count]) => ({ question, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30)
  } catch {
    return []
  }
}

function startOfDayIso(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0))
  return x.toISOString().slice(0, 10)
}

function rangeStart(range: string | null): Date {
  const now = new Date()
  if (range === '3m') return new Date(now.getTime() - 90 * 24 * 3600 * 1000)
  if (range === '1y') return new Date(now.getTime() - 365 * 24 * 3600 * 1000)
  if (range === '1m') return new Date(now.getTime() - 30 * 24 * 3600 * 1000)
  return new Date(0)
}

export async function getAggregatedAnalytics(starId: string, range: string | null) {
  const since = rangeStart(range)
  const sinceMs = since.getTime()

  const data = (await readFile()) as FileShapeV2
  const bucket = data.stars?.[starId] || { events: [], questions: {} }
  const events = Array.isArray(bucket.events) ? bucket.events : []

  const filtered = events.filter((e) => {
    const t = Date.parse(e.ts)
    return Number.isFinite(t) && t >= sinceMs
  })

  const messagesTotal = filtered.length
  const last = bucket.lastMessage || (filtered.length ? { ts: filtered[filtered.length - 1].ts, message: filtered[filtered.length - 1].message } : undefined)

  const perDay: Record<string, number> = {}
  for (const e of filtered) {
    const day = startOfDayIso(new Date(e.ts))
    perDay[day] = (perDay[day] || 0) + 1
  }

  const daySeries = Object.entries(perDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, count]) => ({ day, count }))

  const peak = daySeries.reduce(
    (acc, cur) => (cur.count > acc.count ? cur : acc),
    { day: '', count: 0 }
  )

  const gender: Record<string, number> = {}
  const country: Record<string, number> = {}
  const emails = new Set<string>()
  let tokensSpent = 0

  for (const e of filtered) {
    tokensSpent += typeof e.tokensSpent === 'number' ? e.tokensSpent : 0
    const g = (e.fan?.gender || '').trim()
    const c = (e.fan?.country || '').trim()
    const em = (e.fan?.email || '').trim().toLowerCase()
    if (g) gender[g] = (gender[g] || 0) + 1
    if (c) country[c] = (country[c] || 0) + 1
    if (em) emails.add(em)
  }

  const topCountries = Object.entries(country)
    .map(([k, v]) => ({ country: k, count: v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const topGenders = Object.entries(gender)
    .map(([k, v]) => ({ gender: k, count: v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const opportunities = await getBusinessSignals(starId)

  return {
    range: range || 'all',
    dashboard: {
      messagesTotal,
      lastMessage: last || null,
      peak,
      perDay: daySeries.slice(-60),
    },
    insights: {
      topQuestions: (await getTopQuestions(starId)).slice(0, 15),
      fansCountEstimate: emails.size || null,
      genders: topGenders,
      countries: topCountries,
      businessOpportunities: opportunities,
    },
    revenue: {
      tokensSpent,
      usdEarnedEstimate: Math.round(tokensSpent * 0.05 * 100) / 100,
    },
  }
}

export async function getBusinessSignals(starId: string) {
  const top = await getTopQuestions(starId)
  const keywords = [
    { key: 'hoodie', label: 'Hoodies / merch' },
    { key: 'merch', label: 'Merchandise' },
    { key: 'book', label: 'Books / releases' },
    { key: 'hoodies', label: 'Hoodies / merch' },
    { key: 'tshirt', label: 'T-shirts / merch' },
    { key: 'course', label: 'Courses / education' },
  ]

  const scores: Record<string, number> = {}
  for (const it of top) {
    const q = it.question.toLowerCase()
    for (const k of keywords) {
      if (q.includes(k.key)) scores[k.label] = (scores[k.label] || 0) + it.count
    }
  }

  return Object.entries(scores)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
}

export async function getStarEvents(starId: string, range: string | null): Promise<StarEvent[]> {
  try {
    const since = rangeStart(range)
    const sinceMs = since.getTime()

    const data = (await readFile()) as FileShapeV2
    const bucket = data.stars?.[starId] || { events: [], questions: {} }
    const events = Array.isArray(bucket.events) ? bucket.events : []

    return events.filter((e) => {
      const t = Date.parse(e.ts)
      return Number.isFinite(t) && t >= sinceMs
    })
  } catch {
    return []
  }
}
