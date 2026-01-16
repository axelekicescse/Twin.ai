'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, Briefcase, Compass, LogIn, Newspaper, Search, Shield, Sparkles, User, Users, Wallet, X, Zap, Film } from 'lucide-react'
import { type RecentChat, addTokens, getRecentChats, getTokenBalance } from '@/lib/clientStore'
import { personas } from '@/lib/personas'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [tokenBalance, setTokenBalance] = useState(0)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutPack, setCheckoutPack] = useState<'starter' | 'pro' | 'vip'>('starter')
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242')
  const [cardExpiry, setCardExpiry] = useState('12/34')
  const [cardCvc, setCardCvc] = useState('123')
  const [cardName, setCardName] = useState('')

  const [recents, setRecents] = useState<RecentChat[]>([])

  const [role, setRole] = useState<'fan' | 'star' | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [username, setUsername] = useState<string>('user')
  const [publicName, setPublicName] = useState<string>('')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [starId, setStarId] = useState<string>('')
  const [starQuery, setStarQuery] = useState<string>('')
  const [fanSearch, setFanSearch] = useState('')

  const menuItemsFan = [
    { icon: Sparkles, label: 'Creators', href: '/' },
    { icon: Newspaper, label: 'Feed', href: '/feed' },
    { icon: Users, label: 'Group', href: '/group' },
    { icon: Film, label: 'Backstage', href: '/backstage' },
    { icon: Compass, label: 'Discover', href: '/discover' },
  ]

  const menuItemsStar = [
    { icon: BarChart3, label: 'Dashboard', href: '/star?tab=dashboard' },
    { icon: Sparkles, label: 'Insights', href: '/star?tab=insights' },
    { icon: Shield, label: 'Security', href: '/star?tab=security' },
    { icon: Briefcase, label: 'Business', href: '/star?tab=business' },
    { icon: Wallet, label: 'Revenue', href: '/star?tab=revenue' },
  ]

  useEffect(() => {
    setTokenBalance(getTokenBalance())
    setRecents(getRecentChats())

    const savedRole = window.localStorage.getItem('twinai.role')
    if (savedRole === 'fan' || savedRole === 'star') setRole(savedRole)

    const savedUsername = window.localStorage.getItem('twinai.username')
    if (savedUsername) setUsername(savedUsername)

    const savedPublic = window.localStorage.getItem('twinai.publicName')
    if (savedPublic) setPublicName(savedPublic)

    const savedAvatar = window.localStorage.getItem('userAvatar')
    if (savedAvatar) setUserAvatar(savedAvatar)

    const savedStarId = window.localStorage.getItem('twinai.starId')
    if (savedStarId) setStarId(savedStarId)

    setAuthLoaded(true)

    const onStorage = () => {
      setTokenBalance(getTokenBalance())
      setRecents(getRecentChats())

      const r = window.localStorage.getItem('twinai.role')
      setRole(r === 'fan' || r === 'star' ? r : null)

      const u = window.localStorage.getItem('twinai.username')
      setUsername(u || 'user')

      const pn = window.localStorage.getItem('twinai.publicName')
      setPublicName(pn || '')

      const av = window.localStorage.getItem('userAvatar')
      setUserAvatar(av)

      const s = window.localStorage.getItem('twinai.starId')
      setStarId(s || '')
    }

    window.addEventListener('storage', onStorage)
    const t = window.setInterval(onStorage, 800)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.clearInterval(t)
    }
  }, [])

  const ProfileIcon = role ? User : LogIn

  const displayName = useMemo(() => {
    const pn = (publicName || '').trim()
    if (pn) return pn
    return username
  }, [publicName, username])

  const pack = useMemo(() => {
    if (checkoutPack === 'pro') return { euros: 19, tokens: 250 }
    if (checkoutPack === 'vip') return { euros: 49, tokens: 800 }
    return { euros: 7, tokens: 80 }
  }, [checkoutPack])

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-white/80 dark:bg-gray-950/50 border-r border-gray-200/70 dark:border-white/10 backdrop-blur-xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header with mobile menu button */}
          <div className="flex items-center justify-between px-4 pt-6 pb-5 border-b border-gray-200/70 dark:border-white/10 lg:justify-start">
            <button
              onClick={onToggle}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-2 lg:justify-start">
              <div className="h-20 w-20 rounded-3xl bg-transparent overflow-hidden shadow-sm shrink-0">
                <img
                  src="/avatars/logo.png"
                  alt="Twin.ai"
                  className="h-20 w-20 object-cover scale-[1.35]"
                />
              </div>
              <div className="h-20 flex flex-col justify-center max-w-[150px]">
                <div className="text-[19px] leading-[1.05] font-semibold tracking-tight text-gray-900 dark:text-white truncate">
                  Twin.ai
                </div>
                <div className="mt-1 text-[13px] leading-[1.1] text-gray-500 dark:text-gray-400 truncate">
                  Where fans meet idols
                </div>
              </div>
            </div>
            <div className="lg:hidden w-9" />
          </div>

          {/* Menu items */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {authLoaded && role !== 'star' && (
              <div className="mb-3">
                <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent bg-transparent text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-100/80 dark:hover:bg-white/10 focus-within:border-sky-300 focus-within:bg-white/70 focus-within:ring-4 focus-within:ring-sky-100 dark:focus-within:border-sky-500/40 dark:focus-within:bg-white/10 dark:focus-within:ring-sky-500/10">
                  <Search className="w-5 h-5 text-gray-700/80 dark:text-gray-200/80 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
                  <input
                    value={fanSearch}
                    onChange={(e) => {
                      const v = e.target.value
                      setFanSearch(v)

                      const q = v.trim()
                      if (!q) {
                        if (pathname !== '/') router.push('/')
                        return
                      }
                      router.push(`/search?q=${encodeURIComponent(q)}`)
                    }}
                    placeholder="Search…"
                    className="min-w-0 flex-1 bg-transparent text-base font-medium text-gray-700 outline-none placeholder:font-normal placeholder:text-gray-500 dark:text-gray-200 dark:placeholder:text-gray-400"
                  />
                </div>
              </div>
            )}

            {authLoaded && (role === 'star' ? menuItemsStar : menuItemsFan).map((item) => {
              const Icon = item.icon

              if (role === 'star') {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}

            {authLoaded && role === 'fan' && (
              <div className="pt-4">
                <div className="px-3 text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
                  Conversations
                </div>
                <div className="mt-2 space-y-1">
                  {recents.length ? (
                    recents.map((c) => (
                      <Link
                        key={c.id}
                        href={`/chat/${c.id}`}
                        className="block rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100/80 dark:text-gray-200 dark:hover:bg-white/10 transition-colors"
                      >
                        <div className="truncate font-medium">{c.name}</div>
                        <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                          {c.lastMessage || 'Open chat'}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-xl px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      No recent chats yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </nav>

          {authLoaded && role !== 'star' && (
            <div className="p-4 border-t border-gray-200/70 dark:border-white/10">
            <div className="rounded-2xl border border-gray-200/70 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Tokens</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{tokenBalance}</div>
                </div>
                <button
                  onClick={() => setCheckoutOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#007AFF] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0051D5] transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Buy
                </button>
              </div>
              <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                Fans spend tokens to message stars.
              </div>
            </div>

            <Link
              href="/account"
              className="mt-3 flex items-center justify-between rounded-2xl border border-gray-200/70 bg-white/60 px-3 py-2 text-sm text-gray-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
            >
              <div className="flex items-center gap-2">
                {role ? (
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-200/70 bg-white/80 dark:border-white/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                    {userAvatar ? (
                      <img src={userAvatar} alt="You" className="w-full h-full object-cover" />
                    ) : (
                      <ProfileIcon className="w-4 h-4" />
                    )}
                  </div>
                ) : (
                  <ProfileIcon className="w-4 h-4" />
                )}
                <span className="text-sm font-semibold">{role ? displayName : 'Profile'}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{role ? 'Manage' : 'Sign in'}</span>
            </Link>
            </div>
          )}

          {role === 'star' && (
            <div className="p-4 border-t border-gray-200/70 dark:border-white/10">
              <div className="mb-3 rounded-2xl border border-gray-200/70 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-semibold text-gray-900 dark:text-white">Star Mode</div>
                <div className="mt-2 space-y-2">
                  <input
                    value={starQuery}
                    onChange={(e) => setStarQuery(e.target.value)}
                    placeholder="Search a star…"
                    className="w-full rounded-2xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <select
                    value={starId}
                    onChange={(e) => {
                      const next = e.target.value
                      setStarId(next)
                      window.localStorage.setItem('twinai.starId', next)
                    }}
                    className="w-full rounded-2xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="">Select star</option>
                    {personas
                      .filter((p) => {
                        const q = starQuery.trim().toLowerCase()
                        if (!q) return true
                        return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
                      })
                      .slice(0, 50)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <Link
                href="/account"
                className="flex items-center justify-between rounded-2xl border border-gray-200/70 bg-white/60 px-3 py-2 text-sm text-gray-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
              >
                <div className="flex items-center gap-2">
                  <ProfileIcon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{username}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Account</span>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {checkoutOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setCheckoutOpen(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-gray-200/70 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/80">
            <div className="p-5 border-b border-gray-200/70 dark:border-white/10">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Stripe Checkout (demo)</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Pay in euros to get tokens instantly.</div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setCheckoutPack('starter')}
                  className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    checkoutPack === 'starter'
                      ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200'
                      : 'border-gray-200/70 bg-white/60 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200'
                  }`}
                >
                  Starter
                </button>
                <button
                  onClick={() => setCheckoutPack('pro')}
                  className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    checkoutPack === 'pro'
                      ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200'
                      : 'border-gray-200/70 bg-white/60 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200'
                  }`}
                >
                  Pro
                </button>
                <button
                  onClick={() => setCheckoutPack('vip')}
                  className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    checkoutPack === 'vip'
                      ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200'
                      : 'border-gray-200/70 bg-white/60 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200'
                  }`}
                >
                  VIP
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200/70 bg-white/60 p-4 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{pack.tokens} tokens</div>
                  <div className="font-semibold">€{pack.euros}</div>
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Demo checkout — no real payment.</div>
              </div>

              <div className="space-y-2">
                <input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="Card number"
                  className="w-full rounded-2xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full rounded-2xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <input
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    placeholder="CVC"
                    className="w-full rounded-2xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
                <input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Name"
                  className="w-full rounded-2xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-200/70 dark:border-white/10 flex items-center justify-between gap-3">
              <button
                onClick={() => setCheckoutOpen(false)}
                className="rounded-2xl border border-gray-200/70 bg-white/60 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const next = addTokens(pack.tokens)
                  setTokenBalance(next)
                  setCheckoutOpen(false)
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0051D5] transition-colors"
              >
                <Zap className="w-4 h-4" />
                Pay €{pack.euros}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
