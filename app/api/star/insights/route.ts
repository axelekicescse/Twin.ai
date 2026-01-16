import { NextRequest } from 'next/server'
import { getStarEvents } from '@/lib/starAnalytics'
import { getInsightSources, getStarInsightsSnapshot, refreshStarInsightsIncremental } from '@/lib/starInsights'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const starId = searchParams.get('starId') || ''
  const bucket = searchParams.get('bucket')
  const topic_key = searchParams.get('topic_key')

  if (!starId) {
    return new Response(JSON.stringify({ error: 'Missing starId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (bucket && topic_key) {
    if (bucket !== 'opportunity' && bucket !== 'common_question') {
      return new Response(JSON.stringify({ error: 'Invalid bucket' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await getInsightSources(starId, bucket, topic_key)
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }

  const snapshot = await getStarInsightsSnapshot(starId)
  return new Response(JSON.stringify(snapshot), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const starId = body?.starId || ''
  const range = body?.range || null

  if (!starId) {
    return new Response(JSON.stringify({ error: 'Missing starId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const events = await getStarEvents(starId, range)

  const refreshed = await refreshStarInsightsIncremental({ starId, events })

  return new Response(JSON.stringify(refreshed), {
    status: refreshed.error ? 500 : 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
