import * as GitlawbService from './GitlawbService'
import { getSQLiteMemoryStore } from '../memory/SQLiteMemoryStore'

const SYNC_REPO_PREFIX = 'nexus-memory'
let syncInterval: ReturnType<typeof setInterval> | null = null

export async function exportMemories(): Promise<unknown[]> {
  const store = getSQLiteMemoryStore()
  const all = store.getAllMemories()
  return all.map(m => ({
    id: m.id,
    type: m.type,
    content: m.content,
    importance: m.importance,
    tags: m.tags,
    timestamp: m.timestamp,
  }))
}

export async function importMemories(memories: unknown[]): Promise<number> {
  const store = getSQLiteMemoryStore()
  let imported = 0

  for (const mem of memories) {
    const m = mem as {
      id: string
      type: string
      content: string
      importance: number
      tags: string[]
      timestamp: string
    }

    // Check if already exists
    const existing = store.searchMemories(m.content, 1)
    if (existing.length > 0 && existing[0].id === m.id) continue

    // Resolve conflict: higher importance wins
    if (existing.length > 0 && existing[0].importance >= m.importance) continue

    store.saveMemory({
      type: m.type as 'conversation' | 'learning' | 'error' | 'preference' | 'context' | 'web_search' | 'web_content',
      content: m.content,
      importance: m.importance,
      tags: m.tags,
    })
    imported++
  }

  return imported
}

export async function syncMemory(repoName?: string): Promise<{ pushed: number; pulled: number; error: string | null }> {
  const repo = repoName || SYNC_REPO_PREFIX

  try {
    // Push local memories
    const localMemories = await exportMemories()
    await GitlawbService.pushMemory(repo, localMemories)

    // Pull remote memories
    const remoteMemories = await GitlawbService.pullMemory(repo)
    const imported = await importMemories(remoteMemories)

    return { pushed: localMemories.length, pulled: imported, error: null }
  } catch (err) {
    return { pushed: 0, pulled: 0, error: (err as Error).message }
  }
}

export function startAutoSync(intervalMs: number = 5 * 60 * 1000): void {
  stopAutoSync()
  syncInterval = setInterval(async () => {
    if (GitlawbService.isConnected()) {
      await syncMemory()
    }
  }, intervalMs)
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}
