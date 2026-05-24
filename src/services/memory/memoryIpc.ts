/**
 * Memory IPC — SQLite-backed memory with FTS5 search
 */

import { ipcMain } from 'electron'
import { getSQLiteMemoryStore } from './SQLiteMemoryStore'

export function registerMemoryHandlers() {
  const store = getSQLiteMemoryStore()

  ipcMain.handle('memory:save', async (_event, memory: { type: 'conversation' | 'learning' | 'error' | 'preference' | 'context' | 'web_search' | 'web_content'; content: string; importance: number; tags: string[] }) => {
    try {
      const result = store.saveMemory(memory)
      return { success: true, result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('memory:search', async (_event, query: string, limit?: number) => {
    try {
      const results = store.searchMemories(query, limit || 10)
      return { success: true, result: results }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('memory:search-index', async (_event, query: string, limit?: number) => {
    try {
      const results = store.searchIndex(query, limit || 20)
      return { success: true, result: results }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('memory:details', async (_event, ids: string[]) => {
    try {
      const results = store.getDetails(ids)
      return { success: true, result: results }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('memory:all', async () => {
    try {
      const results = store.getAllMemories()
      return { success: true, result: results }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('memory:recent', async (_event, limit?: number) => {
    try {
      const results = store.getRecentMemories(limit || 10)
      return { success: true, result: results }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('memory:by-type', async (_event, type: string) => {
    try {
      const results = store.getByType(type as 'conversation' | 'learning' | 'error' | 'preference' | 'context' | 'web_search' | 'web_content')
      return { success: true, result: results }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('memory:count', async () => {
    try {
      const count = store.countMemories()
      return { success: true, result: count }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('memory:delete', async (_event, id: string) => {
    try {
      const deleted = store.deleteMemory(id)
      return { success: true, result: deleted }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('memory:clear', async () => {
    try {
      store.clearMemories()
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('memory:knowledge-graph', async () => {
    try {
      const nodes = store.getKnowledgeNodes()
      const edges = store.getKnowledgeEdges()
      return { success: true, result: { nodes, edges } }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
}
