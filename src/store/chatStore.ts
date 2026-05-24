import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Message } from '@/types'

export type { Message }

export type ViewId = 'chat' | 'projects' | 'terminal' | 'memory' | 'monitor' | 'workflows' | 'goals' | 'image-prompts' | 'settings' | 'workflows' | 'prompts' | 'goals' | 'gitlawb'

// Chat Forking
export interface ChatFork {
  id: string
  name: string
  parentMessageId: string
  messages: Message[]
  createdAt: Date
}

// Goal Mode
export type GoalStatus = 'idle' | 'planning' | 'executing' | 'reviewing' | 'completed' | 'failed'
export interface GoalStep {
  id: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  result?: string
}
export interface Goal {
  id: string
  objective: string
  status: GoalStatus
  steps: GoalStep[]
  currentStepIndex: number
  createdAt: Date
  completedAt?: Date
}

// Memory entry for enhanced memory system
export interface MemoryEntry {
  id: string
  content: string
  type: 'fact' | 'preference' | 'context' | 'correction'
  importance: number // 1-10
  tags: string[]
  createdAt: Date
  lastAccessed: Date
  accessCount: number
}

interface ChatState {
  messages: Message[]
  isTyping: boolean
  isStreaming: boolean
  streamingContent: string
  currentModel: string
  sidebarOpen: boolean
  rightPanelOpen: boolean
  activeView: ViewId

  // Chat Forking
  forks: ChatFork[]
  activeForkId: string | null

  // Goal Mode
  currentGoal: Goal | null

  // Enhanced Memory
  memories: MemoryEntry[]

  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  setTyping: (isTyping: boolean) => void
  setStreaming: (streaming: boolean) => void
  appendStreamChunk: (chunk: string) => void
  setCurrentModel: (model: string) => void
  toggleSidebar: () => void
  toggleRightPanel: () => void
  setActiveView: (view: ViewId) => void
  clearMessages: () => void

  // Fork actions
  createFork: (name: string, parentMessageId: string) => void
  switchToFork: (forkId: string | null) => void
  deleteFork: (forkId: string) => void

  // Goal actions
  startGoal: (objective: string) => void
  updateGoalStep: (stepId: string, status: GoalStep['status'], result?: string) => void
  advanceGoal: () => void
  completeGoal: () => void
  failGoal: (reason: string) => void
  clearGoal: () => void

  // Memory actions
  addMemory: (content: string, type: MemoryEntry['type'], importance: number, tags?: string[]) => void
  removeMemory: (id: string) => void
  searchMemories: (query: string) => MemoryEntry[]
  touchMemory: (id: string) => void
  getImportantMemories: (limit?: number) => MemoryEntry[]
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isTyping: false,
      isStreaming: false,
      streamingContent: '',
      currentModel: 'gpt-4',
      sidebarOpen: true,
      rightPanelOpen: false,
      activeView: 'chat' as ViewId,

      // Forking
      forks: [],
      activeForkId: null,

      // Goal
      currentGoal: null,

      // Memory
      memories: [],

      // === Message actions ===
      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: Date.now().toString(),
          timestamp: new Date(),
        }
        const state = get()
        if (state.activeForkId) {
          set((s) => ({
            forks: s.forks.map(f =>
              f.id === s.activeForkId
                ? { ...f, messages: [...f.messages, newMessage] }
                : f
            ),
          }))
        } else {
          set((s) => ({ messages: [...s.messages, newMessage] }))
        }
      },

      setTyping: (isTyping) => set({ isTyping }),
      setStreaming: (streaming) => set({ isStreaming: streaming, streamingContent: '' }),
      appendStreamChunk: (chunk) => set((s) => ({ streamingContent: s.streamingContent + chunk })),
      setCurrentModel: (model) => set({ currentModel: model }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      setActiveView: (view) => set({ activeView: view }),
      clearMessages: () => {
        const state = get()
        if (state.activeForkId) {
          set((s) => ({
            forks: s.forks.filter(f => f.id !== s.activeForkId),
            activeForkId: null,
          }))
        } else {
          set({ messages: [] })
        }
      },

      // === Fork actions ===
      createFork: (name, parentMessageId) => {
        const state = get()
        const sourceMessages = state.activeForkId
          ? state.forks.find(f => f.id === state.activeForkId)?.messages || state.messages
          : state.messages
        const parentIndex = sourceMessages.findIndex(m => m.id === parentMessageId)
        const forkMessages = parentIndex >= 0 ? sourceMessages.slice(0, parentIndex + 1) : [...sourceMessages]

        const fork: ChatFork = {
          id: `fork-${Date.now()}`,
          name,
          parentMessageId,
          messages: forkMessages,
          createdAt: new Date(),
        }
        set((s) => ({ forks: [...s.forks, fork], activeForkId: fork.id }))
      },

      switchToFork: (forkId) => set({ activeForkId: forkId }),

      deleteFork: (forkId) => set((s) => ({
        forks: s.forks.filter(f => f.id !== forkId),
        activeForkId: s.activeForkId === forkId ? null : s.activeForkId,
      })),

      // === Goal actions ===
      startGoal: (objective) => {
        const goal: Goal = {
          id: `goal-${Date.now()}`,
          objective,
          status: 'planning',
          steps: [],
          currentStepIndex: 0,
          createdAt: new Date(),
        }
        set({ currentGoal: goal })
      },

      updateGoalStep: (stepId, status, result) => set((s) => {
        if (!s.currentGoal) return {}
        return {
          currentGoal: {
            ...s.currentGoal,
            steps: s.currentGoal.steps.map(step =>
              step.id === stepId ? { ...step, status, result } : step
            ),
          },
        }
      }),

      advanceGoal: () => set((s) => {
        if (!s.currentGoal) return {}
        const nextIndex = s.currentGoal.currentStepIndex + 1
        if (nextIndex >= s.currentGoal.steps.length) {
          return { currentGoal: { ...s.currentGoal, status: 'completed' as GoalStatus, completedAt: new Date() } }
        }
        return {
          currentGoal: {
            ...s.currentGoal,
            currentStepIndex: nextIndex,
            status: 'executing' as GoalStatus,
          },
        }
      }),

      completeGoal: () => set((s) => ({
        currentGoal: s.currentGoal
          ? { ...s.currentGoal, status: 'completed' as GoalStatus, completedAt: new Date() }
          : null,
      })),

      failGoal: (reason) => set((s) => ({
        currentGoal: s.currentGoal
          ? {
              ...s.currentGoal,
              status: 'failed' as GoalStatus,
              steps: [...s.currentGoal.steps, {
                id: `step-fail-${Date.now()}`,
                description: `Error: ${reason}`,
                status: 'failed' as const,
                result: reason,
              }],
            }
          : null,
      })),

      clearGoal: () => set({ currentGoal: null }),

      // === Memory actions ===
      addMemory: (content, type, importance, tags = []) => {
        const entry: MemoryEntry = {
          id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          content,
          type,
          importance,
          tags,
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 0,
        }
        set((s) => ({ memories: [...s.memories, entry] }))
      },

      removeMemory: (id) => set((s) => ({
        memories: s.memories.filter(m => m.id !== id),
      })),

      searchMemories: (query) => {
        const state = get()
        const lower = query.toLowerCase()
        return state.memories
          .filter(m =>
            m.content.toLowerCase().includes(lower) ||
            m.tags.some(t => t.toLowerCase().includes(lower))
          )
          .sort((a, b) => b.importance - a.importance)
      },

      touchMemory: (id) => set((s) => ({
        memories: s.memories.map(m =>
          m.id === id
            ? { ...m, lastAccessed: new Date(), accessCount: m.accessCount + 1 }
            : m
        ),
      })),

      getImportantMemories: (limit = 10) => {
        const state = get()
        return [...state.memories]
          .sort((a, b) => {
            const scoreA = a.importance * 0.6 + a.accessCount * 0.3 + (a.lastAccessed > new Date(Date.now() - 86400000) ? 1 : 0) * 0.1
            const scoreB = b.importance * 0.6 + b.accessCount * 0.3 + (b.lastAccessed > new Date(Date.now() - 86400000) ? 1 : 0) * 0.1
            return scoreB - scoreA
          })
          .slice(0, limit)
      },
    }),
    {
      name: 'nexus-chat-store',
      partialize: (state) => ({
        messages: state.messages,
        currentModel: state.currentModel,
        forks: state.forks,
        memories: state.memories,
      }),
    }
  )
)
