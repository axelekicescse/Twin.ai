import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { getPersonaById } from '@/lib/personas'
import { buildSystemPrompt } from '@/lib/prompt'
import { safetyCheck } from '@/lib/safety'
import { getStarControl } from '@/lib/starControl'
import { trackFanEvent } from '@/lib/starAnalytics'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { messages, personaId, tokensSpent, fan } = body

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get persona by ID, default to naval if not provided
    const persona = getPersonaById(personaId || 'naval')
    if (!persona) {
      return new Response(
        JSON.stringify({ error: 'Persona not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build authentic personality replication prompt
    // This is the core feature: faithfully replicating the creator's personality
    const basePrompt = buildSystemPrompt(persona)

    const lastUser = [...messages].reverse().find((m: any) => m?.role === 'user')
    const userText = typeof lastUser?.content === 'string' ? lastUser.content : ''

    // Best-effort analytics: track what fans ask most
    trackFanEvent(persona.id, {
      message: userText,
      tokensSpent: typeof tokensSpent === 'number' ? tokensSpent : 0,
      fan: fan && typeof fan === 'object' ? fan : undefined,
    }).catch(() => {})

    // Real-time star controls (managed in /star dashboard)
    const control = await getStarControl(persona.id)

    const forbidden = (control.forbiddenTopics || [])
      .map((t) => String(t || '').trim())
      .filter(Boolean)

    const lowered = userText.toLowerCase()
    const hit = forbidden.find((t) => lowered.includes(t.toLowerCase()))
    if (hit) {
      const encoder = new TextEncoder()
      const refusal = `I can’t discuss that topic. (${hit})`
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: refusal })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    const decision = safetyCheck(userText)

    if (decision.action === 'refuse') {
      const encoder = new TextEncoder()
      const refusal = `${decision.reason}${decision.safeAlternative ? `\n\n${decision.safeAlternative}` : ''}`
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: refusal })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    const promo = (control.promoHooks || []).map((t) => String(t || '').trim()).filter(Boolean)
    const systemPrompt = `${basePrompt}\n\nSTAR DASHBOARD RULES:\n- Forbidden topics: ${forbidden.length ? forbidden.join('; ') : 'none'}\n- Promo hooks (include at most one when relevant, naturally):\n${promo.length ? promo.map((h) => `  - ${h}`).join('\n') : '  - none'}\n\nIf the user asks about a forbidden topic, refuse briefly.`

    const mappedMessages = (messages as any[]).map((m: any) => {
      const role = m?.role
      const text = typeof m?.content === 'string' ? m.content : ''
      const image = typeof m?.imageDataUrl === 'string' ? m.imageDataUrl : undefined

      if (role === 'user' && image) {
        return {
          role: 'user',
          content: [
            ...(text ? [{ type: 'text', text }] : []),
            { type: 'image_url', image_url: { url: image } },
          ],
        }
      }

      return { role, content: text }
    })

    let stream
    try {
      stream = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...mappedMessages,
        ],
        stream: true,
        temperature: 0.6, // More grounded/consistent now that persona facts are richer
        max_tokens: 500, // Increased to allow for more authentic, natural responses
      })
    } catch (openaiError: any) {
      console.error('OpenAI API error:', openaiError)
      const errorMessage = openaiError?.message || 'OpenAI API error'
      const statusCode = openaiError?.status || 500
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API error',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        }),
        { status: statusCode, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
