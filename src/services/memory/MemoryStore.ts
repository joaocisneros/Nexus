/**
 * MemoryStore — Persistent memory system for NEXUS
 * Inspired by Claude-Mem's progressive disclosure approach
 * Stores memories to disk as JSON, with TF-IDF semantic search
 */

import type { Memory } from '@/types'

const MAX_MEMORIES = 2000

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\sáéíóúñü]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
}

function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1)
  }
  for (const [key, val] of tf) {
    tf.set(key, val / tokens.length)
  }
  return tf
}

function computeIDF(documents: string[][]): Map<string, number> {
  const idf = new Map<string, number>()
  const N = documents.length
  const docFreq = new Map<string, number>()

  for (const doc of documents) {
    const seen = new Set<string>()
    for (const term of doc) {
      if (!seen.has(term)) {
        docFreq.set(term, (docFreq.get(term) || 0) + 1)
        seen.add(term)
      }
    }
  }

  for (const [term, freq] of docFreq) {
    idf.set(term, Math.log((N + 1) / (freq + 1)) + 1)
  }

  return idf
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (const [key, val] of a) {
    const bVal = b.get(key) || 0
    dotProduct += val * bVal
    normA += val * val
  }
  for (const val of b.values()) {
    normB += val * val
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}

export class MemoryStore {
  private memories: Map<string, Memory> = new Map()
  private dirty = false
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  async load(): Promise<void> {
    try {
      // In Electron, load from file system via IPC or direct fs
      const stored = localStorage.getItem('nexus-memories')
      if (stored) {
        const parsed = JSON.parse(stored) as Memory[]
        for (const mem of parsed) {
          mem.timestamp = new Date(mem.timestamp)
          this.memories.set(mem.id, mem)
        }
      }
    } catch {
      // Fresh start
    }
  }

  async save(memory: Omit<Memory, 'id' | 'timestamp'>): Promise<Memory> {
    const newMemory: Memory = {
      ...memory,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
    }

    this.memories.set(newMemory.id, newMemory)

    // Auto-prune if over limit
    if (this.memories.size > MAX_MEMORIES) {
      this.prune()
    }

    this.scheduleSave()
    return newMemory
  }

  /**
   * Progressive disclosure search (inspired by Claude-Mem)
   * Returns memories ranked by relevance using TF-IDF cosine similarity
   * plus keyword matching and importance boosting
   */
  async search(query: string, limit = 10): Promise<Memory[]> {
    const queryTokens = tokenize(query)
    if (queryTokens.length === 0) return []

    const allMemories = Array.from(this.memories.values())
    if (allMemories.length === 0) return []

    // Build IDF from all memory contents
    const allDocs = allMemories.map(m => tokenize(m.content))
    const idf = computeIDF(allDocs)
    const queryTF = computeTF(queryTokens)

    // Compute query TF-IDF vector
    const queryVec = new Map<string, number>()
    for (const [term, tf] of queryTF) {
      queryVec.set(term, tf * (idf.get(term) || 1))
    }

    // Score each memory
    const scored = allMemories.map(memory => {
      const memTokens = tokenize(memory.content)
      const memTF = computeTF(memTokens)
      const memVec = new Map<string, number>()
      for (const [term, tf] of memTF) {
        memVec.set(term, tf * (idf.get(term) || 1))
      }

      let score = cosineSimilarity(queryVec, memVec)

      // Boost for exact phrase match
      if (memory.content.toLowerCase().includes(query.toLowerCase())) {
        score += 0.5
      }

      // Boost for tag match
      for (const tag of memory.tags) {
        if (queryTokens.some(t => tag.toLowerCase().includes(t))) {
          score += 0.3
        }
      }

      // Boost for importance (1-10 scale, normalized to 0-0.2)
      score += (memory.importance / 10) * 0.2

      // Recency boost (memories from last 24h get a bonus)
      const hoursSinceCreation = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60)
      if (hoursSinceCreation < 24) score += 0.15
      else if (hoursSinceCreation < 168) score += 0.05

      return { memory, score }
    })

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.memory)
  }

  /**
   * Get compact index (progressive disclosure layer 1)
   * Returns just IDs and summaries — ~50-100 tokens per result
   */
  async searchIndex(query: string, limit = 20): Promise<Array<{ id: string; type: string; summary: string; importance: number }>> {
    const results = await this.search(query, limit)
    return results.map(m => ({
      id: m.id,
      type: m.type,
      summary: m.content.slice(0, 100) + (m.content.length > 100 ? '...' : ''),
      importance: m.importance,
    }))
  }

  /**
   * Get full details for specific IDs (progressive disclosure layer 2)
   */
  async getDetails(ids: string[]): Promise<Memory[]> {
    return ids
      .map(id => this.memories.get(id))
      .filter((m): m is Memory => m !== undefined)
  }

  getAll(): Memory[] {
    return Array.from(this.memories.values())
  }

  count(): number {
    return this.memories.size
  }

  async clear(): Promise<void> {
    this.memories.clear()
    this.scheduleSave()
  }

  async getByType(type: Memory['type']): Promise<Memory[]> {
    return Array.from(this.memories.values()).filter(m => m.type === type)
  }

  async getRecent(limit = 10): Promise<Memory[]> {
    return Array.from(this.memories.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  private prune(): void {
    const sorted = Array.from(this.memories.values())
      .sort((a, b) => {
        // Lower importance first, then older first
        const impDiff = a.importance - b.importance
        if (impDiff !== 0) return impDiff
        return a.timestamp.getTime() - b.timestamp.getTime()
      })

    const toRemove = sorted.slice(0, this.memories.size - Math.floor(MAX_MEMORIES * 0.9))
    for (const mem of toRemove) {
      this.memories.delete(mem.id)
    }
  }

  private scheduleSave(): void {
    this.dirty = true
    if (this.saveTimer) return
    this.saveTimer = setTimeout(() => {
      this.persist()
      this.saveTimer = null
    }, 500) // Debounce saves
  }

  private persist(): void {
    if (!this.dirty) return
    try {
      const data = JSON.stringify(Array.from(this.memories.values()), null, 2)
      localStorage.setItem('nexus-memories', data)
      this.dirty = false
    } catch {
      // Storage full or unavailable
    }
  }
}

// Singleton
let instance: MemoryStore | null = null

export function getMemoryStore(): MemoryStore {
  if (!instance) {
    instance = new MemoryStore()
  }
  return instance
}
