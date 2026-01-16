import fs from 'fs/promises'
import path from 'path'

export type StarControl = {
  forbiddenTopics: string[]
  promoHooks: string[]
}

type FileShape = {
  version: number
  stars: Record<string, StarControl>
}

function filePath() {
  return path.join(process.cwd(), 'data', 'star-control.json')
}

async function readFile(): Promise<FileShape> {
  const raw = await fs.readFile(filePath(), 'utf8')
  return JSON.parse(raw) as FileShape
}

async function writeFile(data: FileShape): Promise<void> {
  await fs.writeFile(filePath(), JSON.stringify(data, null, 2), 'utf8')
}

export async function getStarControl(starId: string): Promise<StarControl> {
  try {
    const data = await readFile()
    return (
      data.stars?.[starId] || {
        forbiddenTopics: [],
        promoHooks: [],
      }
    )
  } catch {
    return { forbiddenTopics: [], promoHooks: [] }
  }
}

export async function setStarControl(starId: string, update: Partial<StarControl>): Promise<StarControl> {
  const data = await readFile()
  const current = data.stars?.[starId] || { forbiddenTopics: [], promoHooks: [] }

  const next: StarControl = {
    forbiddenTopics: Array.isArray(update.forbiddenTopics) ? update.forbiddenTopics : current.forbiddenTopics,
    promoHooks: Array.isArray(update.promoHooks) ? update.promoHooks : current.promoHooks,
  }

  data.stars = { ...data.stars, [starId]: next }
  await writeFile(data)
  return next
}
