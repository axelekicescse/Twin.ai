import { NextRequest } from 'next/server'
import { getStarControl, setStarControl } from '@/lib/starControl'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const starId = searchParams.get('starId') || ''
  if (!starId) {
    return new Response(JSON.stringify({ error: 'Missing starId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const control = await getStarControl(starId)
  return new Response(JSON.stringify({ starId, control }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const starId = body.starId as string
  if (!starId) {
    return new Response(JSON.stringify({ error: 'Missing starId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const forbiddenTopics = Array.isArray(body.forbiddenTopics) ? body.forbiddenTopics : undefined
  const promoHooks = Array.isArray(body.promoHooks) ? body.promoHooks : undefined

  const next = await setStarControl(starId, { forbiddenTopics, promoHooks })
  return new Response(JSON.stringify({ starId, control: next }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
