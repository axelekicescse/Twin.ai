import { z } from 'zod'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const PersonaSchema = z.object({
  name: z.string().default('Naval-style AI'),
  bio: z.string().default('An AI assistant that simulates Naval Ravikant\'s writing style.'),
  style_rules: z.array(z.string()).default([]),
  principles: z.array(z.string()).default([]),
  do_not: z.array(z.string()).default([]),
  examples: z.array(z.object({
    topic: z.string(),
    response: z.string(),
  })).default([]),
})

export type Persona = z.infer<typeof PersonaSchema>

const PERSONA_FILE = join(process.cwd(), 'data', 'persona.json')

export function loadPersona(): Persona {
  try {
    if (!existsSync(PERSONA_FILE)) {
      return PersonaSchema.parse({})
    }
    const content = readFileSync(PERSONA_FILE, 'utf-8')
    const parsed = JSON.parse(content)
    return PersonaSchema.parse(parsed)
  } catch (error) {
    console.error('Error loading persona:', error)
    return PersonaSchema.parse({})
  }
}

export function savePersona(persona: unknown): Persona {
  try {
    const validated = PersonaSchema.parse(persona)
    writeFileSync(PERSONA_FILE, JSON.stringify(validated, null, 2), 'utf-8')
    return validated
  } catch (error) {
    console.error('Error saving persona:', error)
    throw new Error('Invalid persona data')
  }
}
