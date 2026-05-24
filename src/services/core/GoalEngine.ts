/**
 * GoalEngine — Ejecución autónoma multi-turno
 * Inspirado en Claurst: divide objetivos complejos en pasos ejecutables
 */

import { SYSTEM_GOAL_PLANNING, buildGoalStepPrompt, buildGoalRecoveryPrompt, SYSTEM_GOAL_SUMMARY } from '../prompts/NexusPrompts'
import type { AIMessage } from '@/types'

export interface GoalStep {
  id: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  result?: string
  order: number
}

export interface Goal {
  id: string
  objective: string
  steps: GoalStep[]
  status: 'planning' | 'executing' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
  summary?: string
}

type GoalEventCallback = (event: string, data: unknown) => void

export class GoalEngine {
  private goals: Map<string, Goal> = new Map()
  private listeners: GoalEventCallback[] = []
  private aiChat: ((messages: AIMessage[]) => Promise<string>) | null = null
  private brainProcess: ((input: string, type?: string) => Promise<{ success: boolean; result?: unknown; error?: string }>) | null = null

  onEvent(cb: GoalEventCallback) {
    this.listeners.push(cb)
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb)
    }
  }

  private emit(event: string, data: unknown) {
    this.listeners.forEach(cb => cb(event, data))
  }

  setAIBridge(
    chat: (messages: AIMessage[]) => Promise<string>,
    brain: (input: string, type?: string) => Promise<{ success: boolean; result?: unknown; error?: string }>
  ) {
    this.aiChat = chat
    this.brainProcess = brain
  }

  async startGoal(objective: string): Promise<Goal> {
    const goal: Goal = {
      id: `goal-${Date.now()}`,
      objective,
      steps: [],
      status: 'planning',
      createdAt: new Date(),
    }
    this.goals.set(goal.id, goal)
    this.emit('goal:created', goal)

    // Plan steps using AI
    const steps = await this.planSteps(objective)
    goal.steps = steps
    goal.status = 'executing'
    this.emit('goal:planned', { goalId: goal.id, steps })

    // Execute steps sequentially
    await this.executeGoal(goal)

    return goal
  }

  private async planSteps(objective: string): Promise<GoalStep[]> {
    if (!this.aiChat) {
      return [{ id: 'step-1', description: objective, status: 'pending', order: 0 }]
    }

    const planningMessages: AIMessage[] = [
      {
        role: 'system',
        content: SYSTEM_GOAL_PLANNING,
      },
      {
        role: 'user',
        content: `Objetivo: ${objective}`,
      },
    ]

    try {
      const response = await this.aiChat(planningMessages)
      // Try to parse JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*?\]/)
      if (jsonMatch) {
        const descriptions: string[] = JSON.parse(jsonMatch[0])
        return descriptions.map((desc, i) => ({
          id: `step-${i + 1}`,
          description: desc,
          status: 'pending' as const,
          order: i,
        }))
      }
    } catch {
      // Fallback: single step
    }

    return [{ id: 'step-1', description: objective, status: 'pending', order: 0 }]
  }

  private async executeGoal(goal: Goal) {
    for (const step of goal.steps) {
      step.status = 'in_progress'
      this.emit('step:start', { goalId: goal.id, step })

      try {
        const result = await this.executeStep(step, goal)
        step.result = result
        step.status = 'completed'
        this.emit('step:complete', { goalId: goal.id, step })
      } catch (error) {
        step.result = error instanceof Error ? error.message : String(error)
        step.status = 'failed'
        this.emit('step:failed', { goalId: goal.id, step })

        // Try to recover with AI
        if (this.aiChat) {
          const recovered = await this.attemptRecovery(step, goal)
          if (recovered) {
            step.result = recovered
            step.status = 'completed'
            this.emit('step:recovered', { goalId: goal.id, step })
          } else {
            goal.status = 'failed'
            this.emit('goal:failed', { goalId: goal.id, failedStep: step })
            return
          }
        } else {
          goal.status = 'failed'
          this.emit('goal:failed', { goalId: goal.id, failedStep: step })
          return
        }
      }
    }

    goal.status = 'completed'
    goal.completedAt = new Date()
    goal.summary = await this.summarizeGoal(goal)
    this.emit('goal:completed', goal)
  }

  private async executeStep(step: GoalStep, goal: Goal): Promise<string> {
    // Try brain first
    if (this.brainProcess) {
      const brainResult = await this.brainProcess(step.description, 'command')
      if (brainResult.success && brainResult.result) {
        const result = brainResult.result as { result?: string; content?: string }
        return result.result || result.content || JSON.stringify(brainResult.result)
      }
    }

    // Fallback to AI
    if (this.aiChat) {
      const context = goal.steps
        .filter(s => s.status === 'completed')
        .map(s => `${s.description}: ${s.result}`)
        .join('\n')

      const messages: AIMessage[] = [
        {
          role: 'system',
          content: buildGoalStepPrompt(goal.objective, context),
        },
        {
          role: 'user',
          content: `Ejecuta este paso: ${step.description}`,
        },
      ]

      return await this.aiChat(messages)
    }

    return `Paso completado: ${step.description}`
  }

  private async attemptRecovery(step: GoalStep, goal: Goal): Promise<string | null> {
    if (!this.aiChat) return null

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: buildGoalRecoveryPrompt(goal.objective, step.description, step.result || 'Error desconocido'),
      },
      {
        role: 'user',
        content: '¿Cómo puedo resolver este error y continuar?',
      },
    ]

    try {
      const response = await this.aiChat(messages)
      if (response.toUpperCase().includes('SKIP')) return null
      return response
    } catch {
      return null
    }
  }

  private async summarizeGoal(goal: Goal): Promise<string> {
    if (!this.aiChat) {
      return `Objetivo completado: ${goal.objective}`
    }

    const stepResults = goal.steps
      .map(s => `- ${s.description}: ${s.status === 'completed' ? '✅' : '❌'} ${s.result || ''}`)
      .join('\n')

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: SYSTEM_GOAL_SUMMARY,
      },
      {
        role: 'user',
        content: `Objetivo: ${goal.objective}\nPasos:\n${stepResults}`,
      },
    ]

    try {
      return await this.aiChat(messages)
    } catch {
      return `Objetivo completado: ${goal.objective}`
    }
  }

  getGoal(id: string): Goal | undefined {
    return this.goals.get(id)
  }

  getAllGoals(): Goal[] {
    return Array.from(this.goals.values())
  }

  getActiveGoal(): Goal | undefined {
    return Array.from(this.goals.values()).find(g => g.status === 'executing')
  }
}
