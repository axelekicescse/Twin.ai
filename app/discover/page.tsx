'use client'

import { useMemo, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ThemeToggle from '@/components/ThemeToggle'
import Avatar from '@/components/Avatar'
import { Menu } from 'lucide-react'
import starsData from '@/data/discover-stars.json'

type StarCategory =
  | 'Creators'
  | 'Music'
  | 'Film'
  | 'Sports'
  | 'Fighters'
  | 'Tech'
  | 'Politics'

type DiscoverStar = {
  id: string
  name: string
  category: StarCategory
  tagline: string
  avatar: string | null
}

type DiscoverStarsFile = {
  version: number
  stars: DiscoverStar[]
}

const registry = starsData as unknown as DiscoverStarsFile

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

function avatarUrl(name: string, avatar: string | null): string {
  if (avatar) return avatar
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=256&background=0D8ABC&color=fff&bold=true`
}

function StarCard({ star }: { star: DiscoverStar }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-xl dark:border-white/10 dark:bg-gray-900/60 dark:hover:border-white/20">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-sky-500/10 to-indigo-600/10 blur-2xl transition-opacity group-hover:opacity-90" />
      <div className="flex items-center gap-4">
        <Avatar
          name={star.name}
          src={avatarUrl(star.name, star.avatar)}
          letter={star.name?.[0]?.toUpperCase()}
          gradient={stableGradientFromId(star.id)}
          size="md"
          className="flex-shrink-0"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{star.name}</div>
            <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-white/60 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
              {star.category}
            </span>
          </div>
          <div className="mt-1 truncate text-xs text-gray-600 dark:text-gray-300">{star.tagline}</div>
        </div>
      </div>
    </div>
  )
}

function CarouselSection({ title, stars }: { title: string; stars: DiscoverStar[] }) {
  if (!stars.length) return null

  const loop = [...stars, ...stars]

  return (
    <section className="mb-10">
      <div className="flex items-end justify-between gap-4 mb-4">
        <h2 className="text-lg lg:text-xl font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{stars.length} profiles</p>
      </div>
      <div className="tw-marquee -mx-4 px-4">
        <div
          className="tw-marquee__track pb-2"
          style={{
            // longer rows should scroll slower
            ['--tw-marquee-duration' as any]: `${Math.max(18, Math.min(42, stars.length * 3))}s`,
          }}
        >
          {loop.map((s, idx) => (
            <div key={`${s.id}-${idx}`} className="w-[320px] sm:w-[360px] flex-shrink-0">
              <StarCard star={s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function DiscoverPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<StarCategory | 'All'>('All')

  const stars = registry.stars

  const categories = useMemo(() => {
    const set = new Set<StarCategory>()
    for (const s of stars) set.add(s.category)
    return Array.from(set).sort()
  }, [stars])

  const filteredStars = useMemo(() => {
    return stars.filter((s) => {
      const matchCat = activeCategory === 'All' || s.category === activeCategory
      return matchCat
    })
  }, [stars, activeCategory])

  const trending = useMemo(() => stars.slice(0, 12), [stars])
  const byCategory = useMemo(() => {
    const map = new Map<StarCategory, DiscoverStar[]>()
    for (const s of stars) {
      const arr = map.get(s.category) || []
      arr.push(s)
      map.set(s.category, arr)
    }
    return map
  }, [stars])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/50">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>

            {/* Theme toggle */}
            <ThemeToggle />
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Page heading */}
            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white">
                Discover
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Explore a curated universe of stars — creators, fighters, artists, athletes, and icons.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory('All')}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    activeCategory === 'All'
                      ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200'
                      : 'border-gray-200/70 bg-white/60 text-gray-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-200'
                  }`}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setActiveCategory(c)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      activeCategory === c
                        ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200'
                        : 'border-gray-200/70 bg-white/60 text-gray-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <CarouselSection title="Trending now" stars={trending} />

            {activeCategory === 'All' && (
              <>
                {categories.map((c) => (
                  <CarouselSection key={c} title={c} stars={(byCategory.get(c) || []).slice(0, 12)} />
                ))}
              </>
            )}

            <section className="mb-8">
              <div className="flex items-end justify-between gap-4 mb-4">
                <h2 className="text-lg lg:text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  All stars
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{filteredStars.length} results</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredStars.map((star) => (
                  <StarCard key={star.id} star={star} />
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
