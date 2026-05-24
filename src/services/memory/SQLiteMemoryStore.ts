/**
 * SQLiteMemoryStore — Persistent memory with FTS5 full-text search
 * Inspired by claude-mem: SQLite + FTS5 + progressive disclosure
 */

import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import type { Memory } from '@/types'

export class SQLiteMemoryStore {
  private db: Database.Database
  private readonly MAX_MEMORIES = 5000

  constructor(dbPath?: string) {
    const defaultPath = path.join(app.getPath('userData'), 'nexus-memory.db')
    this.db = new Database(dbPath || defaultPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.initialize()
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        importance INTEGER NOT NULL DEFAULT 5,
        tags TEXT NOT NULL DEFAULT '[]',
        timestamp TEXT NOT NULL,
        embedding_hash TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
      CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);

      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        content,
        tags,
        content='memories',
        content_rowid='rowid',
        tokenize='unicode61 remove_diacritics 2'
      );

      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, content, tags) VALUES (new.rowid, new.content, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content, tags) VALUES ('delete', old.rowid, old.content, old.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content, tags) VALUES ('delete', old.rowid, old.content, old.tags);
        INSERT INTO memories_fts(rowid, content, tags) VALUES (new.rowid, new.content, new.tags);
      END;

      CREATE TABLE IF NOT EXISTS knowledge_nodes (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        frequency INTEGER NOT NULL DEFAULT 1,
        first_seen TEXT NOT NULL,
        last_seen TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS knowledge_edges (
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        weight INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (source, target)
      );
    `)
  }

  saveMemory(memory: Omit<Memory, 'id' | 'timestamp'>): Memory {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const timestamp = new Date().toISOString()
    const newMemory: Memory = {
      ...memory,
      id,
      timestamp: new Date(timestamp),
    }

    const stmt = this.db.prepare(`
      INSERT INTO memories (id, type, content, importance, tags, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(id, memory.type, memory.content, memory.importance, JSON.stringify(memory.tags), timestamp)

    // Prune if over limit
    this.pruneIfNeeded()

    return newMemory
  }

  searchMemories(query: string, limit = 10): Memory[] {
    if (!query.trim()) return []

    // FTS5 search with BM25 ranking
    const ftsResults = this.db.prepare(`
      SELECT m.*, rank
      FROM memories_fts fts
      JOIN memories m ON m.rowid = fts.rowid
      WHERE memories_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(this.ftsQuery(query), limit * 2) as Array<Memory & { rank: number }>

    if (ftsResults.length > 0) {
      return ftsResults.slice(0, limit).map(r => ({
        ...r,
        timestamp: new Date(r.timestamp),
        tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags,
      }))
    }

    // Fallback: LIKE search
    const likeResults = this.db.prepare(`
      SELECT * FROM memories
      WHERE content LIKE ? OR tags LIKE ?
      ORDER BY importance DESC, timestamp DESC
      LIMIT ?
    `).all(`%${query}%`, `%${query}%`, limit) as Array<Memory & { tags: string }>

    return likeResults.map(r => ({
      ...r,
      timestamp: new Date(r.timestamp),
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags,
    }))
  }

  /**
   * Progressive disclosure: search index (layer 1)
   * Returns compact summaries — ~50 tokens per result
   */
  searchIndex(query: string, limit = 20): Array<{ id: string; type: string; summary: string; importance: number }> {
    const results = this.searchMemories(query, limit)
    return results.map(m => ({
      id: m.id,
      type: m.type,
      summary: m.content.slice(0, 100) + (m.content.length > 100 ? '...' : ''),
      importance: m.importance,
    }))
  }

  /**
   * Progressive disclosure: full details (layer 2)
   */
  getDetails(ids: string[]): Memory[] {
    if (ids.length === 0) return []
    const placeholders = ids.map(() => '?').join(',')
    const results = this.db.prepare(`
      SELECT * FROM memories WHERE id IN (${placeholders})
    `).all(...ids) as Array<Memory & { tags: string }>

    return results.map(r => ({
      ...r,
      timestamp: new Date(r.timestamp),
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags,
    }))
  }

  getAllMemories(): Memory[] {
    const results = this.db.prepare(`
      SELECT * FROM memories ORDER BY timestamp DESC
    `).all() as Array<Memory & { tags: string }>

    return results.map(r => ({
      ...r,
      timestamp: new Date(r.timestamp),
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags,
    }))
  }

  getRecentMemories(limit = 10): Memory[] {
    const results = this.db.prepare(`
      SELECT * FROM memories ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as Array<Memory & { tags: string }>

    return results.map(r => ({
      ...r,
      timestamp: new Date(r.timestamp),
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags,
    }))
  }

  getByType(type: Memory['type']): Memory[] {
    const results = this.db.prepare(`
      SELECT * FROM memories WHERE type = ? ORDER BY timestamp DESC
    `).all(type) as Array<Memory & { tags: string }>

    return results.map(r => ({
      ...r,
      timestamp: new Date(r.timestamp),
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags,
    }))
  }

  countMemories(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM memories').get() as { count: number }
    return row.count
  }

  deleteMemory(id: string): boolean {
    const result = this.db.prepare('DELETE FROM memories WHERE id = ?').run(id)
    return result.changes > 0
  }

  clearMemories(): void {
    this.db.exec('DELETE FROM memories')
  }

  // === Knowledge Graph persistence ===

  saveKnowledgeNode(id: string, label: string, frequency: number): void {
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO knowledge_nodes (id, label, frequency, first_seen, last_seen)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        frequency = frequency + 1,
        last_seen = excluded.last_seen
    `).run(id, label, frequency, now, now)
  }

  saveKnowledgeEdge(source: string, target: string, weight: number): void {
    this.db.prepare(`
      INSERT INTO knowledge_edges (source, target, weight)
      VALUES (?, ?, ?)
      ON CONFLICT(source, target) DO UPDATE SET weight = weight + excluded.weight
    `).run(source, target, weight)
  }

  getKnowledgeNodes(limit = 100): Array<{ id: string; label: string; frequency: number }> {
    return this.db.prepare(`
      SELECT id, label, frequency FROM knowledge_nodes ORDER BY frequency DESC LIMIT ?
    `).all(limit) as Array<{ id: string; label: string; frequency: number }>
  }

  getKnowledgeEdges(limit = 200): Array<{ source: string; target: string; weight: number }> {
    return this.db.prepare(`
      SELECT source, target, weight FROM knowledge_edges ORDER BY weight DESC LIMIT ?
    `).all(limit) as Array<{ source: string; target: string; weight: number }>
  }

  // === Private helpers ===

  private ftsQuery(query: string): string {
    // Escape special FTS5 characters and build OR query
    const words = query
      .replace(/['"*(){}[\]^~\\:]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1)

    if (words.length === 0) return query.replace(/['"]/g, '')

    return words.join(' OR ')
  }

  private pruneIfNeeded(): void {
    const count = this.countMemories()
    if (count <= this.MAX_MEMORIES) return

    const toDelete = count - Math.floor(this.MAX_MEMORIES * 0.9)
    this.db.prepare(`
      DELETE FROM memories WHERE id IN (
        SELECT id FROM memories
        ORDER BY importance ASC, timestamp ASC
        LIMIT ?
      )
    `).run(toDelete)
  }

  close(): void {
    this.db.close()
  }
}

// Singleton
let instance: SQLiteMemoryStore | null = null

export function getSQLiteMemoryStore(): SQLiteMemoryStore {
  if (!instance) {
    instance = new SQLiteMemoryStore()
  }
  return instance
}
