'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ThemeToggle from '@/components/ThemeToggle'
import Avatar from '@/components/Avatar'
import { Menu, Send, UserPlus, Users } from 'lucide-react'
import { personas } from '@/lib/personas'
import { getAvatarForPersona } from '@/lib/avatar'
import { getTokenBalance, spendTokens } from '@/lib/clientStore'
import { cleanResponseText } from '@/lib/textCleaner'

type GroupMessage = {
  id: string
  role: 'you' | 'star' | 'member'
  author: string
  content: string
}

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default function GroupChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [starId, setStarId] = useState(personas[0]?.id || 'naval')
  const [memberName, setMemberName] = useState('')
  const [members, setMembers] = useState<string[]>(['Alex', 'Maya'])
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [tokenBalance, setTokenBalance] = useState(0)
  const endRef = useRef<HTMLDivElement>(null)

  const star = useMemo(() => personas.find((p) => p.id === starId) || personas[0], [starId])
  const starAvatar = star ? getAvatarForPersona(star) : null

  const TOKENS_PER_STAR_MESSAGE = 2

  useEffect(() => {
    setTokenBalance(getTokenBalance())
    const t = window.setInterval(() => setTokenBalance(getTokenBalance()), 800)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    // Reset when switching star
    setMessages([
      {
        id: randomId(),
        role: 'star',
        author: star?.name || 'Star',
        content: 'Welcome to the group chat. Invite friends and talk together.',
      },
    ])
  }, [starId])

  const addMember = () => {
    const name = memberName.trim()
    if (!name) return
    if (members.includes(name)) return
    setMembers((prev) => [...prev, name].slice(0, 6))
    setMemberName('')
  }

  const maybeMemberReaction = () => {
    const pool = members
    if (!pool.length) return
    const who = pool[Math.floor(Math.random() * pool.length)]
    const reactions = [
      'That’s interesting.',
      'Wait what? lol',
      'Real.',
      'Can you elaborate?',
      'This is gold.',
      'I agree.',
    ]
    const content = reactions[Math.floor(Math.random() * reactions.length)]
    setMessages((prev) => [...prev, { id: randomId(), role: 'member', author: who, content }])
  }

  const sendToStar = async (newMessages: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    if (!star) return
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages, personaId: star.id }),
    })

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`)
    }

    const reader = resp.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let full = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return cleanResponseText(full)
        if (!data) continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.content) full += parsed.content
        } catch {
          // ignore
        }
      }
    }

    return cleanResponseText(full)
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading || !star) return

    const spent = spendTokens(TOKENS_PER_STAR_MESSAGE)
    setTokenBalance(spent.balance)

    if (!spent.ok) {
      setMessages((prev) => [
        ...prev,
        {
          id: randomId(),
          role: 'star',
          author: star.name,
          content: `Not enough tokens. Group chat costs ${TOKENS_PER_STAR_MESSAGE} tokens per star reply. Buy tokens in the sidebar.`,
        },
      ])
      return
    }

    const yourMsg: GroupMessage = { id: randomId(), role: 'you', author: 'You', content: input }
    setInput('')
    setIsLoading(true)
    setMessages((prev) => [...prev, yourMsg])

    window.setTimeout(() => maybeMemberReaction(), 450)

    try {
      // Provide only the 'you' messages to the star model as 'user'
      const convoForStar = [...messages, yourMsg]
        .filter((m) => m.role === 'you' || m.role === 'star')
        .slice(-18)
        .map((m) =>
          m.role === 'you'
            ? ({ role: 'user', content: m.content } as const)
            : ({ role: 'assistant', content: m.content } as const)
        )

      const reply = await sendToStar(convoForStar)

      setMessages((prev) => [
        ...prev,
        {
          id: randomId(),
          role: 'star',
          author: star.name,
          content: reply || '…',
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: randomId(),
          role: 'star',
          author: star.name,
          content: 'Sorry — the twin is unavailable right now.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

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

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/70 bg-white/60 px-3 py-1 text-xs text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
                <Users className="w-4 h-4" />
                Group chat
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Balance: {tokenBalance}</div>
            </div>

            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-1">
              <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Star</div>
                <div className="mt-3">
                  <select
                    value={starId}
                    onChange={(e) => setStarId(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {star && starAvatar && (
                  <div className="mt-4 flex items-center gap-3">
                    <Avatar
                      name={star.name}
                      src={starAvatar.avatarImage}
                      letter={starAvatar.avatarLetter}
                      gradient={starAvatar.avatarGradient}
                      size="md"
                    />
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{star.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {TOKENS_PER_STAR_MESSAGE} tokens / star reply
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 text-sm font-semibold text-gray-900 dark:text-white">Invite members</div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Name"
                    className="flex-1 rounded-2xl border border-gray-200/70 bg-white/80 px-3 py-2 text-sm text-gray-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <button
                    onClick={addMember}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#007AFF] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0051D5] transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {members.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center rounded-full border border-gray-200/70 bg-white/60 px-3 py-1 text-xs text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="lg:col-span-2 flex flex-col">
              <div className="flex-1 overflow-hidden rounded-3xl border border-gray-200/70 bg-white/70 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <div className="p-4 border-b border-gray-200/70 dark:border-white/10">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Room</div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Demo group chat — friends react + star replies.
                  </div>
                </div>

                <div className="p-4 space-y-3 h-[520px] overflow-y-auto">
                  {messages.map((m) => {
                    const isYou = m.role === 'you'
                    const isStar = m.role === 'star'
                    return (
                      <div key={m.id} className={`flex ${isYou ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] ${isYou ? 'text-right' : 'text-left'}`}>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{m.author}</div>
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-[15px] leading-[1.4] ${
                              isYou
                                ? 'bg-[#007AFF] text-white'
                                : isStar
                                  ? 'bg-white text-gray-900 dark:bg-gray-900/60 dark:text-white'
                                  : 'bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white'
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {isLoading && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">Star is typing…</div>
                  )}
                  <div ref={endRef} />
                </div>

                <div className="p-4 border-t border-gray-200/70 dark:border-white/10">
                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Message the room"
                      className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-[15px] text-gray-900 outline-none focus:ring-2 focus:ring-[#007AFF] dark:bg-white/10 dark:text-white"
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={isLoading || !input.trim()}
                      className="inline-flex items-center justify-center rounded-full bg-[#007AFF] p-2.5 text-white hover:bg-[#0051D5] disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
