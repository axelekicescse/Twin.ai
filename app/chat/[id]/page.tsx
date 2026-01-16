'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Brain, Camera, CheckCircle2, Mic, Send, Sparkles, User, Waves } from 'lucide-react'
import { cleanResponseText } from '@/lib/textCleaner'
import { getPersonaById } from '@/lib/personas'
import ThemeToggle from '@/components/ThemeToggle'
import Avatar from '@/components/Avatar'
import { getAvatarForPersona } from '@/lib/avatar'
import { getTokenBalance, loadChatHistory, saveChatHistory, spendTokens, upsertRecentChat } from '@/lib/clientStore'

interface Message {
  role: 'user' | 'assistant'
  content: string
  imageDataUrl?: string
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const personaId = params.id as string
  const persona = getPersonaById(personaId)

  const [messages, setMessages] = useState<Message[]>([])
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [tokenBalance, setTokenBalance] = useState(0)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [fanMeta, setFanMeta] = useState<{ email?: string }>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const revealTimerRef = useRef<number | null>(null)
  const pendingQueueRef = useRef<string[]>([])
  const revealInitialDelayMsRef = useRef<number>(0)
  const messageQueueRef = useRef<Array<{ content: string; imageDataUrl?: string }>>([])
  const isProcessingRef = useRef(false)
  const messagesRef = useRef<Message[]>([])

  // Redirect if persona not found
  useEffect(() => {
    if (!persona) {
      router.push('/')
    }
  }, [persona, router])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    setTokenBalance(getTokenBalance())
    const t = window.setInterval(() => setTokenBalance(getTokenBalance()), 800)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    const username = window.localStorage.getItem('twinai.username') || undefined
    setFanMeta({ email: username })
  }, [])

  // Load user avatar from localStorage
  useEffect(() => {
    const savedAvatar = localStorage.getItem('userAvatar')
    if (savedAvatar) {
      setUserAvatar(savedAvatar)
    }
  }, [])

  useEffect(() => {
    if (!persona) return
    setHasLoadedHistory(false)
    setMessages(loadChatHistory(persona.id))
    setHasLoadedHistory(true)
  }, [persona?.id])

  useEffect(() => {
    if (!persona) return
    if (!hasLoadedHistory) return
    saveChatHistory(persona.id, messages)

    const last = messages[messages.length - 1]?.content
    if (last) {
      upsertRecentChat(persona, last)
    } else {
      upsertRecentChat(persona)
    }
  }, [messages, persona, hasLoadedHistory])

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const readAsDataUrl = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('Failed to read image'))
        reader.readAsDataURL(blob)
      })

    const downscaleImage = async (input: File) => {
      // Keep this conservative: large phone photos can be huge.
      const maxDim = 1024
      const quality = 0.82

      const objectUrl = URL.createObjectURL(input)
      try {
        const img = new Image()
        img.decoding = 'async'
        img.src = objectUrl
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('Failed to decode image'))
        })

        const w = img.naturalWidth || img.width
        const h = img.naturalHeight || img.height
        if (!w || !h) throw new Error('Invalid image dimensions')

        const scale = Math.min(1, maxDim / Math.max(w, h))
        const outW = Math.max(1, Math.round(w * scale))
        const outH = Math.max(1, Math.round(h * scale))

        const canvas = document.createElement('canvas')
        canvas.width = outW
        canvas.height = outH
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas not supported')
        ctx.drawImage(img, 0, 0, outW, outH)

        const blob: Blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Failed to compress image'))),
            'image/jpeg',
            quality
          )
        })

        return { blob, dataUrl: await readAsDataUrl(blob) }
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }

    ;(async () => {
      try {
        // Always try to downscale (best for mobile).
        const { dataUrl } = await downscaleImage(file)

        // Guardrail: reject extremely large payloads even after compression.
        // ~2.5MB base64 string threshold (approx) to avoid huge requests.
        if (dataUrl.length > 2_500_000) {
          setTokenError('Image is too large. Please choose a smaller image or take a lower-resolution photo.')
          setAttachedImage(null)
          return
        }

        setAttachedImage(dataUrl)
      } catch (err) {
        console.warn('Image compression failed, falling back to original', err)
        try {
          const original = await readAsDataUrl(file)
          if (original.length > 2_500_000) {
            setTokenError('Image is too large. Please choose a smaller image or take a lower-resolution photo.')
            setAttachedImage(null)
            return
          }
          setAttachedImage(original)
        } catch {
          setTokenError('Could not attach image. Please try another photo.')
          setAttachedImage(null)
        }
      }
    })()
  }


  const TOKENS_PER_MESSAGE = 1

  const stopRevealTimer = () => {
    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current)
      revealTimerRef.current = null
    }
  }

  const randInt = (min: number, max: number) => {
    return Math.floor(min + Math.random() * (max - min + 1))
  }

  const typingBaseMsRef = useRef<number>(36)
  const typingJitterMsRef = useRef<number>(14)

  const delayForChunk = (chunk: string) => {
    const last = chunk.slice(-1)
    const base = typingBaseMsRef.current
    const jitter = typingJitterMsRef.current
    const jittered = Math.max(12, base + randInt(-jitter, jitter))
    if (last === '.' || last === '!' || last === '?' || last === '\n') return jittered + randInt(160, 260)
    if (last === ',' || last === ';' || last === ':') return jittered + randInt(90, 160)
    return jittered
  }

  const startRevealLoop = (assistantMessageIndex: number) => {
    if (revealTimerRef.current) return

    const tick = () => {
      const next = pendingQueueRef.current.shift()
      if (!next) {
        revealTimerRef.current = null
        return
      }

      setMessages((prev) => {
        if (assistantMessageIndex < 0 || assistantMessageIndex >= prev.length) return prev
        const cur = prev[assistantMessageIndex]
        if (!cur || cur.role !== 'assistant') return prev
        const updated = [...prev]
        updated[assistantMessageIndex] = { ...cur, content: (cur.content || '') + next }
        return updated
      })

      revealTimerRef.current = window.setTimeout(tick, delayForChunk(next))
    }

    const initial = revealInitialDelayMsRef.current > 0 ? revealInitialDelayMsRef.current : 260
    revealInitialDelayMsRef.current = 0
    revealTimerRef.current = window.setTimeout(tick, initial)
  }

  const enqueueReveal = (assistantMessageIndex: number, text: string) => {
    if (!text) return
    // Chunk by small groups of chars to simulate typing while preserving original text.
    const chunkSize = 4
    for (let i = 0; i < text.length; i += chunkSize) {
      pendingQueueRef.current.push(text.slice(i, i + chunkSize))
    }
    startRevealLoop(assistantMessageIndex)
  }

  const splitAssistantReply = (text: string) => {
    const parts = text
      .split(/\n\s*\[\[NEXT\]\]\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)

    if (parts.length <= 1) return null
    return {
      first: parts[0],
      second: parts.slice(1).join('\n\n'),
    }
  }

  const autoSplitAssistantReply = (text: string) => {
    const cleaned = String(text || '').trim()
    if (!cleaned) return [] as string[]
    if (cleaned.length <= 520) return [cleaned]

    const maxLen = 520
    const chunks: string[] = []
    let rest = cleaned

    while (rest.length > maxLen) {
      const candidate = rest.slice(0, maxLen + 1)

      // Prefer splitting at paragraph boundaries, then sentence boundaries, then spaces.
      const breakpoints = [
        candidate.lastIndexOf('\n\n'),
        candidate.lastIndexOf('. '),
        candidate.lastIndexOf('! '),
        candidate.lastIndexOf('? '),
        candidate.lastIndexOf('\n'),
        candidate.lastIndexOf(' '),
      ]

      let cut = breakpoints.find((b) => b >= 280) ?? -1
      if (cut === -1) cut = maxLen

      // Keep punctuation with the previous chunk when applicable.
      if (cut === candidate.lastIndexOf('. ') || cut === candidate.lastIndexOf('! ') || cut === candidate.lastIndexOf('? ')) {
        cut = cut + 1
      }

      const head = rest.slice(0, cut).trim()
      if (head) chunks.push(head)
      rest = rest.slice(cut).trim()
    }

    if (rest) chunks.push(rest)
    return chunks
  }

  const processQueue = async () => {
    if (isProcessingRef.current) return
    if (!persona) return
    if (!messageQueueRef.current.length) return

    isProcessingRef.current = true
    try {
      while (messageQueueRef.current.length) {
        const next = messageQueueRef.current.shift()
        if (!next) continue

        const content = next.content
        const imageDataUrl = next.imageDataUrl

        setTokenError(null)
        const spent = spendTokens(TOKENS_PER_MESSAGE)
        setTokenBalance(spent.balance)

        if (!spent.ok) {
          const msg = `Not enough tokens. You need ${TOKENS_PER_MESSAGE} token per message. Please buy tokens in the sidebar.`
          setTokenError(msg)
          setMessages((prev) => [...prev, { role: 'assistant', content: msg }])
          continue
        }

        const userMessage: Message = { role: 'user', content, imageDataUrl }
        const baseMessages = messagesRef.current
        const last = baseMessages[baseMessages.length - 1]
        const alreadyAppended =
          last?.role === 'user' &&
          last?.content === userMessage.content &&
          (last?.imageDataUrl || undefined) === (userMessage.imageDataUrl || undefined)

        const newMessages = alreadyAppended ? baseMessages : [...baseMessages, userMessage]
        const assistantMessageIndex = newMessages.length

        // Immediately show typing indicator bubble for the assistant
        setMessages([...newMessages, { role: 'assistant', content: '' }])
        setIsLoading(true)
        setIsTyping(true)

        // Send user message to webhook (fire-and-forget, don't block UI)
        fetch('https://eozq2v1buy7eipb.m.pipedream.net', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            personaId: persona.id,
            personaName: persona.name,
            timestamp: new Date().toISOString(),
            userId: params.id, // Chat ID
          }),
        }).catch((error) => {
          console.error('Webhook error (non-blocking):', error)
        })

        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: newMessages,
              personaId: persona.id,
              tokensSpent: TOKENS_PER_MESSAGE,
              fan: fanMeta,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const errorMsg = errorData.error || `HTTP ${response.status}: ${response.statusText}`
            const details = errorData.details || ''
            throw new Error(`${errorMsg}${details ? ` - ${details}` : ''}`)
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('No response body')
          }

          const decoder = new TextDecoder()
          let fullResponse = ''
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
              if (data === '[DONE]') {
                continue
              }
              if (!data) continue
              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  fullResponse += parsed.content
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', data, e)
              }
            }
          }

          const waitForDrain = async (maxMs = 60000) => {
            const start = Date.now()
            while (pendingQueueRef.current.length > 0 || revealTimerRef.current) {
              if (Date.now() - start > maxMs) break
              await new Promise((r) => setTimeout(r, 40))
            }
          }

          const cleanedText = cleanResponseText(fullResponse)
          const explicitSplit = splitAssistantReply(cleanedText)
          const parts = explicitSplit
            ? [explicitSplit.first, explicitSplit.second]
            : autoSplitAssistantReply(cleanedText)

          pendingQueueRef.current = []
          stopRevealTimer()
          setMessages((prev) => {
            const updated = [...prev]
            if (assistantMessageIndex >= 0 && assistantMessageIndex < updated.length) {
              const cur = updated[assistantMessageIndex]
              if (cur?.role === 'assistant') updated[assistantMessageIndex] = { ...cur, content: '' }
            }
            return updated
          })

          for (let i = 0; i < parts.length; i++) {
            const part = String(parts[i] || '').trim()
            if (!part) continue

            const index = assistantMessageIndex + i
            if (i > 0) {
              setMessages((prev) => {
                const updated = [...prev]
                updated.splice(index, 0, { role: 'assistant', content: '' })
                return updated
              })
            }

            typingBaseMsRef.current = randInt(26, 58)
            typingJitterMsRef.current = randInt(8, 22)

            // Delay from visible typing bubble to first characters
            revealInitialDelayMsRef.current = i === 0 ? randInt(3000, 6000) : randInt(1000, 3000)

            enqueueReveal(index, part)
            await waitForDrain()
          }

        } catch (error) {
          console.error('Error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          setMessages((prev) => {
            if (!prev.length) return [{ role: 'assistant', content: `Sorry, I encountered an error: ${errorMessage}. Please check your API key and try again.` }]
            const lastIndex = prev.length - 1
            const last = prev[lastIndex]
            if (last?.role === 'assistant') {
              const updated = [...prev]
              updated[lastIndex] = {
                role: 'assistant',
                content: `Sorry, I encountered an error: ${errorMessage}. Please check your API key and try again.`,
              }
              return updated
            }
            return [...prev, {
              role: 'assistant',
              content: `Sorry, I encountered an error: ${errorMessage}. Please check your API key and try again.`,
            }]
          })
        } finally {
          setIsLoading(false)
          setIsTyping(false)
        }
      }
    } finally {
      isProcessingRef.current = false
    }
  }

  const sendMessage = async (content: string) => {
    if ((!content.trim() && !attachedImage) || !persona) return

    const payload = { content, imageDataUrl: attachedImage || undefined }
    messageQueueRef.current.push(payload)
    setInput('')
    setAttachedImage(null)

    // Optimistically add the user's message immediately
    setMessages((prev) => [...prev, { role: 'user', content, imageDataUrl: attachedImage || undefined }])

    // Start processing if needed
    processQueue()

  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  if (!persona) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Persona not found
          </h1>
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Go back home
          </Link>
        </div>
      </div>
    )
  }

  const { avatarImage, avatarLetter, avatarGradient } = getAvatarForPersona(persona)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/70 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-3">
            <Avatar
              name={persona.name}
              src={avatarImage}
              letter={avatarLetter}
              gradient={avatarGradient}
              size="sm"
            />
            <div className="leading-tight">
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
                {persona.name}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Verified twin
                {typeof persona.refreshedDaysAgo === 'number' ? ` • Clone refreshed ${persona.refreshedDaysAgo} days ago` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-amber-900 dark:text-amber-200">
            ⚠️ {persona.disclaimer}
          </p>
          <p className="mt-1 text-xs text-amber-900/70 dark:text-amber-200/70">
            Costs {TOKENS_PER_MESSAGE} token per message. Balance: {tokenBalance}
          </p>
        </div>
      </div>


      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-1">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Start a conversation with {persona.name}
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <Avatar
                  name={persona.name}
                  src={avatarImage}
                  letter={avatarLetter}
                  gradient={avatarGradient}
                  size="sm"
                  className="flex-shrink-0"
                />
              )}
              
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[65%]`}>
                {msg.role === 'assistant' && (msg.content || isTyping) && (
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{persona.name}</span>
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="mb-1 px-1">
                    <span className="text-xs italic text-gray-600 dark:text-gray-400">You</span>
                  </div>
                )}
                {msg.role === 'assistant' && !msg.content && !isTyping ? null : (
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    }`}
                    style={{
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    }}
                  >
                    {msg.role === 'assistant' && !msg.content && isTyping ? (
                      <div className="flex gap-1 items-center h-[21px]">
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.4]">
                        {msg.content}
                      </p>
                    )}
                  </div>
                )}

                {msg.role === 'user' && !!msg.imageDataUrl && (
                  <div className="mt-2 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                    <img src={msg.imageDataUrl} alt="Attachment" className="w-full max-h-64 object-cover" />
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center overflow-hidden">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt="You"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 sm:px-4 py-3">
        <div className="max-w-4xl mx-auto">
          {!!attachedImage && (
            <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-gray-200/70 bg-white/60 p-2 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 overflow-hidden rounded-xl border border-gray-200/70 bg-white/80 dark:border-white/10 dark:bg-white/10">
                  <img src={attachedImage} alt="Attachment preview" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-900 dark:text-white">Image attached</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">Ready to send</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="rounded-xl border border-gray-200/70 bg-white/70 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-gray-200"
              >
                Remove
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              title="Attach image"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageAttach}
              className="hidden"
            />
            <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message"
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:bg-white dark:focus:bg-gray-600 text-[15px] transition-colors text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                disabled={false}
              />
              <button
                type="submit"
                disabled={!input.trim() && !attachedImage}
                className="p-2.5 bg-[#007AFF] text-white rounded-full hover:bg-[#0051D5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
        {!!tokenError && (
          <div className="max-w-4xl mx-auto pt-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              {tokenError}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
