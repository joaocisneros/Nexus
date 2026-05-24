import type { Memory } from '@/types'

export type { Memory }

const STORAGE_KEY = 'nexus-memories'
const MAX_MEMORIES = 1000

export class MemoryManager {
  private memories: Map<string, Memory> = new Map()

  async loadMemories(): Promise<void> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: Memory[] = JSON.parse(stored)
        for (const mem of parsed) {
          mem.timestamp = new Date(mem.timestamp)
          this.memories.set(mem.id, mem)
        }
      }
    } catch {
      // Si hay error, empezar con memoria vacía
    }
  }

  private persist(): void {
    const arr = Array.from(this.memories.values())
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
  }

  async saveMemory(memory: Omit<Memory, 'id' | 'timestamp'>): Promise<Memory> {
    const newMemory: Memory = {
      ...memory,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      timestamp: new Date(),
    }

    this.memories.set(newMemory.id, newMemory)

    // Pruning si excede el límite
    if (this.memories.size > MAX_MEMORIES) {
      this.prune()
    }

    this.persist()
    return newMemory
  }

  async findRelevantMemories(query: string): Promise<Memory[]> {
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2)

    const scored: Array<{ memory: Memory; score: number }> = []

    for (const memory of this.memories.values()) {
      let score = 0
      const contentLower = memory.content.toLowerCase()

      // Coincidencia exacta de frase
      if (contentLower.includes(queryLower)) {
        score += 10
      }

      // Coincidencia de palabras individuales
      for (const word of queryWords) {
        if (contentLower.includes(word)) {
          score += 2
        }
      }

      // Matching de tags
      for (const tag of memory.tags) {
        if (queryLower.includes(tag.toLowerCase())) {
          score += 3
        }
      }

      // Bonus por importancia
      score += memory.importance * 0.3

      // Bonus por recencia (últimas 24h)
      const hoursSince = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60)
      if (hoursSince < 24) {
        score += 2
      } else if (hoursSince < 168) {
        score += 1
      }

      if (score > 0) {
        scored.push({ memory, score })
      }
    }

    // Ordenar por relevancia y devolver top 10
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(s => s.memory)
  }

  getAllMemories(): Memory[] {
    return Array.from(this.memories.values())
  }

  async countMemories(): Promise<number> {
    return this.memories.size
  }

  private prune(): void {
    const sorted = Array.from(this.memories.values()).sort(
      (a, b) => a.importance - b.importance || a.timestamp.getTime() - b.timestamp.getTime()
    )

    // Eliminar las menos importantes y más antiguas
    const toRemove = sorted.slice(0, this.memories.size - MAX_MEMORIES + 100)
    for (const mem of toRemove) {
      this.memories.delete(mem.id)
    }
  }

  async clearMemories(): Promise<void> {
    this.memories.clear()
    localStorage.removeItem(STORAGE_KEY)
  }
}
