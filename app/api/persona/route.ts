import { NextRequest } from 'next/server'
import { loadPersona, savePersona } from '@/lib/persona'

export async function GET() {
  try {
    const persona = loadPersona()
    return Response.json(persona)
  } catch (error) {
    console.error('Error loading persona:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to load persona' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const persona = savePersona(body)
    return Response.json(persona)
  } catch (error) {
    console.error('Error saving persona:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to save persona' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
