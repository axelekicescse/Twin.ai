import { NextRequest } from 'next/server'
import { getAggregatedAnalytics } from '@/lib/starAnalytics'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const starId = searchParams.get('starId') || ''
  const range = searchParams.get('range')
  if (!starId) {
    return new Response(JSON.stringify({ error: 'Missing starId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const data = await getAggregatedAnalytics(starId, range)
  return new Response(JSON.stringify({ starId, ...data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
