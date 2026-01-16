import { NextRequest } from 'next/server'
import { getLatestSocialPosts } from '@/lib/socialProviders'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const starId = searchParams.get('starId') || ''

  if (!starId) {
    return new Response(JSON.stringify({ error: 'Missing starId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const result = await getLatestSocialPosts(starId)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return new Response(JSON.stringify({ error: 'Failed to load posts', details: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
