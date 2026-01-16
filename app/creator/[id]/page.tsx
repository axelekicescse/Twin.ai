'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Brain, CheckCircle2, MessageCircle, Mic, Sparkles, Users, Waves } from 'lucide-react'
import Avatar from '@/components/Avatar'
import ThemeToggle from '@/components/ThemeToggle'
import { getPersonaById } from '@/lib/personas'
import { getCreatorProfile } from '@/lib/creators'
import { getAvatarForPersona } from '@/lib/avatar'
import { useLatestSocialPosts } from '@/lib/hooks/useLatestSocialPosts'

function formatFansCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return `${n}`
}

function stableNumberFromString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export default function CreatorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const persona = getPersonaById(id)
  const creator = getCreatorProfile(id)

  const { posts, source, loading } = useLatestSocialPosts(id)

  if (!persona) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Creator not found</h1>
            <p className="text-gray-600 dark:text-gray-400">This profile doesn&apos;t exist.</p>
          </div>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0051D5] transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    )
  }

  const { avatarImage, avatarLetter, avatarGradient } = getAvatarForPersona(persona)

  const fans = creator?.fanCount ?? 50_000 + (stableNumberFromString(id) % 9_950_000)
  const bioText = creator?.bioShort || persona.bio || 'No bio available yet.'
  const tags = creator?.tags || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/50">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 lg:px-6 h-16">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3">
            <Avatar
              name={persona.name}
              src={avatarImage}
              letter={avatarLetter}
              gradient={avatarGradient}
              size="sm"
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{persona.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Profile</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-6">
            <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start gap-4">
                <Avatar
                  name={persona.name}
                  src={avatarImage}
                  letter={avatarLetter}
                  gradient={avatarGradient}
                  size="lg"
                  className="flex-shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                    {persona.name}
                  </h1>

                  {!!creator?.knownAs?.length && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Also known as: {creator.knownAs.join(', ')}
                    </p>
                  )}

                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                    {bioText}
                  </p>

                  {!!tags.length && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center rounded-full border border-gray-200/70 bg-white/60 px-3 py-1 text-xs text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/chat/${persona.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#007AFF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0051D5] transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat
                    </Link>

                    <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200/70 bg-white/60 px-4 py-2 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
                      <Users className="w-4 h-4" />
                      {formatFansCount(fans)} fans
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">How this twin was created</div>
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Not just a chat — a co-creation process with real people.
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Day 1 → Day 30</div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                    <Mic className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Interviews</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                    <Brain className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Personality modeling</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                    <Sparkles className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Style extraction</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                    <Waves className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Voice pattern training</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                    <CheckCircle2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Validation by the creator</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <span>Day 1</span>
                    <span>Day 30</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-gray-200/70 dark:bg-white/10 overflow-hidden">
                    <div className="h-full w-[78%] rounded-full bg-[#007AFF]" />
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                    <div className="col-span-2">Capture</div>
                    <div className="col-span-1 text-center">Model</div>
                    <div className="col-span-1 text-center">Tune</div>
                    <div className="col-span-1 text-right">Validate</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Latest posts</h2>

              {loading ? (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Loading…</p>
              ) : posts.length ? (
                <>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Source: {source === 'api' ? 'Official APIs' : 'Fallback data'}
                  </p>
                  <div className="mt-4 space-y-3">
                    {posts.slice(0, 6).map((p, idx) => (
                      <a
                        key={`${p.platform}-${p.date || ''}-${idx}`}
                        href={p.url || '#'}
                        target={p.url ? '_blank' : undefined}
                        rel={p.url ? 'noreferrer' : undefined}
                        className="block rounded-2xl border border-gray-200/70 bg-white/60 p-4 hover:bg-white transition-colors dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs font-semibold text-gray-900 dark:text-white">{p.platform}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{p.date || ''}</div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                          {p.text}
                        </div>
                      </a>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  No posts available yet. Add IDs in <code>data/social-accounts.json</code> + API keys in <code>.env.local</code>, or fill <code>data/star-knowledge.json</code>.
                </p>
              )}
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Socials</h2>

              {(() => {
                const socials = creator?.socials
                const entries: Array<{ label: string; url: string }> = []

                if (socials?.website) entries.push({ label: 'Website', url: socials.website })
                if (socials?.youtube) entries.push({ label: 'YouTube', url: socials.youtube })
                if (socials?.instagram) entries.push({ label: 'Instagram', url: socials.instagram })
                if (socials?.x) entries.push({ label: 'X', url: socials.x })
                if (socials?.tiktok) entries.push({ label: 'TikTok', url: socials.tiktok })
                if (socials?.twitch) entries.push({ label: 'Twitch', url: socials.twitch })
                if (socials?.wikipedia) entries.push({ label: 'Wikipedia', url: socials.wikipedia })

                if (entries.length) {
                  return (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entries.map((s) => (
                        <a
                          key={`${s.label}-${s.url}`}
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-gray-200/70 bg-white/60 px-4 py-3 text-sm text-gray-700 hover:bg-white transition-colors dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">{s.label}</div>
                          <div className="mt-1 text-xs break-all text-gray-500 dark:text-gray-400">{s.url}</div>
                        </a>
                      ))}
                    </div>
                  )
                }

                if (creator?.sources?.length) {
                  return (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {creator.sources.map((s) => (
                        <a
                          key={`${s.label}-${s.url}`}
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-gray-200/70 bg-white/60 px-4 py-3 text-sm text-gray-700 hover:bg-white transition-colors dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">{s.label}</div>
                          <div className="mt-1 text-xs break-all text-gray-500 dark:text-gray-400">{s.url}</div>
                        </a>
                      ))}
                    </div>
                  )
                }

                return <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">No social links yet.</p>
              })()}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">About</h2>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{persona.disclaimer}</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
