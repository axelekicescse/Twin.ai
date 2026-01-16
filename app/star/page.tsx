'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ThemeToggle from '@/components/ThemeToggle'
import { Menu, Save } from 'lucide-react'
import { personas } from '@/lib/personas'

type Control = {
  forbiddenTopics: string[]
  promoHooks: string[]
}

type AnalyticsItem = { question: string; count: number }

type AnalyticsResponse = {
  dashboard: {
    messagesTotal: number
    lastMessage: { ts: string; message: string } | null
    peak: { day: string; count: number }
    perDay: Array<{ day: string; count: number }>
  }
  insights: {
    topQuestions: AnalyticsItem[]
    fansCountEstimate: number | null
    genders: Array<{ gender: string; count: number }>
    countries: Array<{ country: string; count: number }>
    businessOpportunities: Array<{ label: string; count: number }>
  }
  revenue: {
    tokensSpent: number
    usdEarnedEstimate: number
  }
}

type InsightBucket = 'opportunity' | 'common_question'

type InsightCard = {
  title: string
  topic_key: string
  bucket: InsightBucket
  count: number
  last_seen: string
  score: number
}

type InsightsSnapshot = {
  starId: string
  cards: {
    opportunities: InsightCard[]
    commonQuestions: InsightCard[]
  }
  processedCount: number
}

type InsightSourceMessage = {
  id: string
  text: string
  ts: string
  conversationHref?: string | null
}

function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function StarDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900 flex">
          <div className="w-72 bg-white/80 dark:bg-gray-950/50 border-r border-gray-200/70 dark:border-white/10 backdrop-blur-xl" />
          <div className="flex-1 p-6">
            <div className="max-w-2xl mx-auto overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <div className="h-6 w-40 rounded-lg bg-gray-200/70 dark:bg-white/10" />
              <div className="mt-3 h-4 w-64 rounded-lg bg-gray-200/70 dark:bg-white/10" />
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-20 rounded-2xl border border-gray-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5" />
                <div className="h-20 rounded-2xl border border-gray-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5" />
                <div className="h-20 rounded-2xl border border-gray-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5" />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <StarDashboardInner />
    </Suspense>
  )
}

function StarDashboardInner() {
  const router = useRouter()
  const search = useSearchParams()
  const tab = search.get('tab') || 'dashboard'
  const range = search.get('range') || '1m'

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [starId, setStarId] = useState(personas[0]?.id || 'naval')

  const [forbiddenText, setForbiddenText] = useState('')
  const [promoText, setPromoText] = useState('')
  const [saving, setSaving] = useState(false)

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)

  const [insightsSnapshot, setInsightsSnapshot] = useState<InsightsSnapshot | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)
  const [showMoreOpp, setShowMoreOpp] = useState(false)
  const [showMoreCommon, setShowMoreCommon] = useState(false)
  const [selectedCard, setSelectedCard] = useState<{ bucket: InsightBucket; topic_key: string; title: string } | null>(null)
  const [selectedSources, setSelectedSources] = useState<InsightSourceMessage[]>([])
  const [sourcesLoading, setSourcesLoading] = useState(false)

  const [canAccess, setCanAccess] = useState<boolean | null>(null)

  useEffect(() => {
    const r = window.localStorage.getItem('twinai.role')
    setCanAccess(r === 'star')
  }, [])

  useEffect(() => {
    const savedStar = window.localStorage.getItem('twinai.starId')
    if (savedStar) setStarId(savedStar)
  }, [])

  useEffect(() => {
    const t = window.setInterval(() => {
      const savedStar = window.localStorage.getItem('twinai.starId')
      if (savedStar && savedStar !== starId) setStarId(savedStar)
    }, 800)
    return () => window.clearInterval(t)
  }, [starId])

  useEffect(() => {
    if (!canAccess) return

    fetch(`/api/star/control?starId=${encodeURIComponent(starId)}`)
      .then((r) => r.json())
      .then((j) => {
        const c: Control | undefined = j?.control
        if (!c) return
        setForbiddenText((c.forbiddenTopics || []).join('\n'))
        setPromoText((c.promoHooks || []).join('\n'))
      })
      .catch(() => {})

    fetch(`/api/star/analytics?starId=${encodeURIComponent(starId)}&range=${encodeURIComponent(range)}`)
      .then((r) => r.json())
      .then((j) => {
        setAnalytics((j || null) as AnalyticsResponse | null)
      })
      .catch(() => setAnalytics(null))
  }, [starId, canAccess, range])

  const loadInsightsSnapshot = useCallback(async () => {
    setInsightsLoading(true)
    setInsightsError(null)
    try {
      const r = await fetch(`/api/star/insights?starId=${encodeURIComponent(starId)}`)
      const j = (await r.json()) as any
      if (!r.ok) throw new Error(j?.error || 'Failed to load insights')
      setInsightsSnapshot(j as InsightsSnapshot)
    } catch (e: any) {
      setInsightsError(e?.message || 'Failed to load insights')
      setInsightsSnapshot(null)
    } finally {
      setInsightsLoading(false)
    }
  }, [starId])

  const refreshInsights = useCallback(async () => {
    setInsightsLoading(true)
    setInsightsError(null)
    try {
      const r = await fetch('/api/star/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starId, range }),
      })
      const j = (await r.json()) as any
      if (!r.ok) throw new Error(j?.error || 'Failed to refresh insights')
      const snap = j?.snapshot
      if (snap) setInsightsSnapshot(snap as InsightsSnapshot)
      else await loadInsightsSnapshot()
    } catch (e: any) {
      setInsightsError(e?.message || 'Failed to refresh insights')
    } finally {
      setInsightsLoading(false)
    }
  }, [starId, range, loadInsightsSnapshot])

  const openCard = async (card: InsightCard) => {
    setSelectedCard({ bucket: card.bucket, topic_key: card.topic_key, title: card.title })
    setSelectedSources([])
    setSourcesLoading(true)
    try {
      const url = `/api/star/insights?starId=${encodeURIComponent(starId)}&bucket=${encodeURIComponent(
        card.bucket
      )}&topic_key=${encodeURIComponent(card.topic_key)}`
      const r = await fetch(url)
      const j = (await r.json()) as any
      if (!r.ok) throw new Error(j?.error || 'Failed to load sources')
      setSelectedSources(Array.isArray(j?.sources) ? (j.sources as InsightSourceMessage[]) : [])
    } catch {
      setSelectedSources([])
    } finally {
      setSourcesLoading(false)
    }
  }

  useEffect(() => {
    if (!canAccess) return
    if (tab !== 'insights') return

    loadInsightsSnapshot()
      .then(() => refreshInsights())
      .catch(() => {})
  }, [tab, canAccess, loadInsightsSnapshot, refreshInsights])

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/star/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          starId,
          forbiddenTopics: splitLines(forbiddenText),
          promoHooks: splitLines(promoText),
        }),
      })
    } finally {
      setSaving(false)
    }
  }

  if (canAccess === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900 flex">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/50">
            <div className="flex items-center justify-between px-4 lg:px-6 h-16">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            <div className="max-w-2xl mx-auto overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Star dashboard</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Loading…</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900 flex">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/50">
            <div className="flex items-center justify-between px-4 lg:px-6 h-16">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            <div className="max-w-2xl mx-auto overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Star dashboard</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                You are not in Star mode. Click the login icon in the sidebar and choose “Star space”.
              </p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900 flex">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/50">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-gray-200/70 bg-white/60 px-3 py-2 text-sm text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white">
                <span className="font-semibold">Star Mode</span>
                <span className="mx-2 text-gray-400">•</span>
                <span>
                  {personas.find((p) => p.id === starId)?.name || starId || 'Select a star in Account'}
                </span>
              </div>

              <select
                value={range}
                onChange={(e) => {
                  const next = e.target.value
                  const url = new URL(window.location.href)
                  url.searchParams.set('range', next)
                  router.replace(url.toString())
                }}
                className="rounded-2xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <option value="1m">Last 1 month</option>
                <option value="3m">Last 3 months</option>
                <option value="1y">Last 1 year</option>
                <option value="all">All time</option>
              </select>

              {(tab === 'security' || tab === 'business') && (
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0051D5] disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-6xl mx-auto">
            {tab === 'dashboard' && (
              <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Dashboard</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Fan messages, last message, and peak.</p>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-gray-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Fan messages</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                      {analytics?.dashboard?.messagesTotal ?? 0}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Peak day</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                      {analytics?.dashboard?.peak?.day || '—'}
                    </div>
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      {analytics?.dashboard?.peak?.count || 0} messages
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Last message</div>
                    <div className="mt-1 text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                      {analytics?.dashboard?.lastMessage?.message || '—'}
                    </div>
                    <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                      {analytics?.dashboard?.lastMessage?.ts || ''}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Messages per day</div>
                  <div className="mt-3 space-y-2">
                    {(analytics?.dashboard?.perDay || []).slice(-14).map((d) => (
                      <div
                        key={d.day}
                        className="flex items-center justify-between rounded-2xl border border-gray-200/70 bg-white/60 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="text-xs text-gray-700 dark:text-gray-200">{d.day}</div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-white">{d.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'insights' && (
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                  <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Insights</h2>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    AI clustering of fan messages into stable topics. Only new messages are processed.
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Processed messages: {insightsSnapshot?.processedCount ?? 0}
                    </div>
                    <button
                      onClick={refreshInsights}
                      disabled={insightsLoading}
                      className="rounded-2xl border border-gray-200/70 bg-white/60 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-white disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
                    >
                      {insightsLoading ? 'Refreshing…' : 'Refresh insights'}
                    </button>
                  </div>

                  {insightsError && (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                      {insightsError}
                    </div>
                  )}

                  <div className="mt-6">
                    <div className="flex items-end justify-between gap-4">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">Opportunities</div>
                      <button
                        type="button"
                        onClick={() => setShowMoreOpp((v) => !v)}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {showMoreOpp ? 'Less' : 'More'}
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(insightsSnapshot?.cards?.opportunities || []).slice(0, showMoreOpp ? 50 : 10).map((c) => (
                        <button
                          key={`${c.bucket}:${c.topic_key}`}
                          onClick={() => openCard(c)}
                          className="w-full text-left rounded-2xl border border-gray-200/70 bg-white/60 px-4 py-3 text-sm hover:bg-white dark:border-white/10 dark:bg-white/5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {c.title}
                              </div>
                              <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                                Last seen: {c.last_seen}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="text-xs font-semibold text-gray-900 dark:text-white">{c.count}</div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400">{c.score}/100</div>
                            </div>
                          </div>
                        </button>
                      ))}
                      {!insightsLoading && !(insightsSnapshot?.cards?.opportunities || []).length && (
                        <div className="rounded-2xl border border-gray-200/70 bg-white/60 px-4 py-3 text-xs text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                          No opportunities yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="flex items-end justify-between gap-4">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">Common Questions</div>
                      <button
                        type="button"
                        onClick={() => setShowMoreCommon((v) => !v)}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {showMoreCommon ? 'Less' : 'More'}
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(insightsSnapshot?.cards?.commonQuestions || []).slice(0, showMoreCommon ? 50 : 10).map((c) => (
                        <button
                          key={`${c.bucket}:${c.topic_key}`}
                          onClick={() => openCard(c)}
                          className="w-full text-left rounded-2xl border border-gray-200/70 bg-white/60 px-4 py-3 text-sm hover:bg-white dark:border-white/10 dark:bg-white/5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {c.title}
                              </div>
                              <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                                Last seen: {c.last_seen}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="text-xs font-semibold text-gray-900 dark:text-white">{c.count}</div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400">{c.score}/100</div>
                            </div>
                          </div>
                        </button>
                      ))}
                      {!insightsLoading && !(insightsSnapshot?.cards?.commonQuestions || []).length && (
                        <div className="rounded-2xl border border-gray-200/70 bg-white/60 px-4 py-3 text-xs text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                          No common questions yet.
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <aside className="space-y-6">
                  <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Fan demographics</h3>
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                      Genders/countries come from demo account metadata.
                    </p>

                    <div className="mt-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Fans (estimate)</div>
                      <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                        {analytics?.insights?.fansCountEstimate ?? '—'}
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="text-xs font-semibold text-gray-900 dark:text-white">Top countries</div>
                      <div className="mt-2 space-y-2">
                        {(analytics?.insights?.countries || []).slice(0, 6).map((c) => (
                          <div key={c.country} className="flex items-center justify-between rounded-2xl border border-gray-200/70 bg-white/60 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/5">
                            <div className="text-gray-700 dark:text-gray-200">{c.country}</div>
                            <div className="font-semibold text-gray-900 dark:text-white">{c.count}</div>
                          </div>
                        ))}
                        {!analytics?.insights?.countries?.length && (
                          <div className="text-xs text-gray-600 dark:text-gray-300">No data.</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="text-xs font-semibold text-gray-900 dark:text-white">Genders</div>
                      <div className="mt-2 space-y-2">
                        {(analytics?.insights?.genders || []).slice(0, 6).map((g) => (
                          <div key={g.gender} className="flex items-center justify-between rounded-2xl border border-gray-200/70 bg-white/60 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/5">
                            <div className="text-gray-700 dark:text-gray-200">{g.gender}</div>
                            <div className="font-semibold text-gray-900 dark:text-white">{g.count}</div>
                          </div>
                        ))}
                        {!analytics?.insights?.genders?.length && (
                          <div className="text-xs text-gray-600 dark:text-gray-300">No data.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </aside>

                {selectedCard && (
                  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                      onClick={() => setSelectedCard(null)}
                    />
                    <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200/70 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/80">
                      <div className="p-5 border-b border-gray-200/70 dark:border-white/10">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedCard.title}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {selectedCard.bucket} • {selectedCard.topic_key}
                        </div>
                      </div>

                      <div className="p-5">
                        {sourcesLoading ? (
                          <div className="text-sm text-gray-600 dark:text-gray-300">Loading messages…</div>
                        ) : selectedSources.length ? (
                          <div className="space-y-3">
                            {selectedSources.map((m) => (
                              <div
                                key={m.id}
                                className="rounded-2xl border border-gray-200/70 bg-white/60 p-4 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
                              >
                                <div className="text-xs text-gray-500 dark:text-gray-400">{m.ts}</div>
                                <div className="mt-2 whitespace-pre-wrap text-sm">{m.text}</div>
                                {m.conversationHref && (
                                  <a
                                    href={m.conversationHref}
                                    className="mt-2 inline-block text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300"
                                  >
                                    Open conversation
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600 dark:text-gray-300">No source messages yet.</div>
                        )}
                      </div>

                      <div className="p-5 border-t border-gray-200/70 dark:border-white/10 flex items-center justify-end gap-3">
                        <button
                          onClick={() => setSelectedCard(null)}
                          className="rounded-2xl border border-gray-200/70 bg-white/60 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'security' && (
              <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Security</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Forbidden topics. Changes apply immediately.</p>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Forbidden topics</div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">One topic per line.</p>
                  <textarea
                    value={forbiddenText}
                    onChange={(e) => setForbiddenText(e.target.value)}
                    rows={10}
                    className="mt-2 w-full rounded-2xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                    placeholder="Example:\nIndia-Pakistan conflict\nGaza war\nMedical advice"
                  />
                </div>
              </div>
            )}

            {tab === 'business' && (
              <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Business</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Promo hooks for your twin.</p>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Promo hooks</div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">One line per hook.</p>
                  <textarea
                    value={promoText}
                    onChange={(e) => setPromoText(e.target.value)}
                    rows={10}
                    className="mt-2 w-full rounded-2xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                    placeholder="Example:\nIf asked about my book, mention the next edition is coming soon.\nIf asked about merch, mention hoodies drop soon."
                  />
                </div>
              </div>
            )}

            {tab === 'revenue' && (
              <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Revenue</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Tokens spent and estimated earnings.</p>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-gray-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Tokens spent</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                      {analytics?.revenue?.tokensSpent ?? 0}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs text-gray-500 dark:text-gray-400">USD earned (estimate)</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                      {analytics?.revenue?.usdEarnedEstimate ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
