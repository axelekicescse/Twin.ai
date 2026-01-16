'use client'

import { useMemo, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ThemeToggle from '@/components/ThemeToggle'
import Avatar from '@/components/Avatar'
import { Heart, Menu, MessageCircle, Sparkles } from 'lucide-react'

type FeedItem = {
  id: string
  starId: string
  starName: string
  starAvatar?: string | null
  snippet: string
  timeAgo: string
  likes: number
}

type ComingSoonItem = {
  id: string
  name: string
  category: string
  daysRemaining: number
  likes: number
}

const demoFeed: FeedItem[] = [
  {
    id: '1',
    starId: 'mrbeast',
    starName: 'MrBeast',
    starAvatar: '/avatars/MrBeast_2023_(cropped).jpg.webp',
    snippet: '“How do I stay consistent when motivation drops?”',
    timeAgo: '2m',
    likes: 184,
  },
  {
    id: '2',
    starId: 'naval',
    starName: 'Naval Ravikant',
    starAvatar: '/avatars/Naval_Ravikant_(cropped).jpg',
    snippet: '“What skill compounds the fastest?”',
    timeAgo: '11m',
    likes: 92,
  },
  {
    id: '3',
    starId: 'dream',
    starName: 'Dream',
    starAvatar: '/avatars/dream.jpg',
    snippet: '“How do you deal with pressure online?”',
    timeAgo: '34m',
    likes: 61,
  },
  {
    id: '4',
    starId: 'ishowspeed',
    starName: 'IShowSpeed',
    starAvatar: '/avatars/IShowSpeed_at_Chinatown_(Portrait)_04.jpg.webp',
    snippet: '“Give me a hype routine for game day.”',
    timeAgo: '1h',
    likes: 210,
  },
]

const comingSoon: ComingSoonItem[] = [
  { id: 'cs_justin', name: 'Justin Bieber', category: 'Music', daysRemaining: 12, likes: 1240 },
  { id: 'cs_kylian', name: 'Kylian Mbappé', category: 'Sports', daysRemaining: 18, likes: 880 },
  { id: 'cs_ufc', name: 'Alex Pereira', category: 'Fighters', daysRemaining: 24, likes: 640 },
]

function stableGradientFromId(id: string): string {
  const gradients = [
    'from-sky-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-rose-500',
    'from-fuchsia-500 to-violet-600',
    'from-blue-500 to-cyan-600',
    'from-slate-500 to-slate-700',
  ]

  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return gradients[Math.abs(hash) % gradients.length]
}

function avatarUrl(name: string, avatar?: string | null): string {
  if (avatar) return avatar
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=256&background=0D8ABC&color=fff&bold=true`
}

export default function FeedPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [liked, setLiked] = useState<Record<string, boolean>>({})

  const computedFeed = useMemo(() => {
    return demoFeed.map((item) => {
      const isLiked = !!liked[item.id]
      return {
        ...item,
        likes: item.likes + (isLiked ? 1 : 0),
        isLiked,
      }
    })
  }, [liked])

  const computedSoon = useMemo(() => {
    return comingSoon.map((c) => {
      const isLiked = !!liked[c.id]
      return {
        ...c,
        likes: c.likes + (isLiked ? 1 : 0),
        isLiked,
      }
    })
  }, [liked])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900 flex">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col lg:ml-0">
        <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/50">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>

            <div className="flex-1" />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <div className="relative">
                <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-sky-500/20 to-indigo-600/20 blur-3xl" />
                <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-600/10 blur-3xl" />

                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/70 bg-white/60 px-3 py-1 text-xs text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
                    <Sparkles className="w-4 h-4" />
                    Live pulse
                  </div>
                  <h1 className="mt-3 text-2xl lg:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
                    The Feed
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm lg:text-base text-gray-600 dark:text-gray-300">
                    A glimpse into what fans are asking — and what creators’ twins are replying. (Demo data)
                  </p>
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    Twins can make mistakes. Check important info. Don&apos;t kill yourself, btw.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section className="lg:col-span-2">
                <div className="flex items-end justify-between gap-4 mb-4">
                  <h2 className="text-lg lg:text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                    Latest interactions
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{computedFeed.length} items</p>
                </div>

                <div className="space-y-4">
                  {computedFeed.map((item) => (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="flex items-start gap-4">
                        <Avatar
                          name={item.starName}
                          src={avatarUrl(item.starName, item.starAvatar)}
                          letter={item.starName?.[0]?.toUpperCase()}
                          gradient={stableGradientFromId(item.starId)}
                          size="md"
                          className="flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {item.starName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{item.timeAgo} ago</div>
                            </div>

                            <button
                              onClick={() => setLiked((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                item.isLiked
                                  ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
                                  : 'border-gray-200/70 bg-white/60 text-gray-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-200'
                              }`}
                            >
                              <Heart className="w-4 h-4" />
                              {item.likes}
                            </button>
                          </div>

                          <div className="mt-3 rounded-2xl border border-gray-200/70 bg-white/60 px-4 py-3 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
                            {item.snippet}
                          </div>

                          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <MessageCircle className="w-4 h-4" />
                            Fan asked • Twin replied (simulated)
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="space-y-6">
                <section className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Coming soon</h3>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    Replication in progress. Co-creating with the real creator.
                  </p>

                  <div className="mt-4 space-y-3">
                    {computedSoon.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-2xl border border-gray-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {c.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {c.category} • {c.daysRemaining} days remaining
                            </div>
                          </div>

                          <button
                            onClick={() => setLiked((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              c.isLiked
                                ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
                                : 'border-gray-200/70 bg-white/60 text-gray-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-200'
                            }`}
                          >
                            <Heart className="w-4 h-4" />
                            {c.likes}
                          </button>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                            <span>Progress</span>
                            <span>{Math.max(0, 30 - c.daysRemaining)} / 30 days</span>
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-gray-200/70 dark:bg-white/10">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600"
                              style={{ width: `${Math.min(100, Math.max(3, ((30 - c.daysRemaining) / 30) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">What is Twin.ai?</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Twin.ai is a startup concept that creates official AI replicas of real creators and influencers.
                  </p>
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    Core feature: an Authentic Personality Replication Engine — learned via a co-creation process with the real creator.
                  </p>
                </section>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
