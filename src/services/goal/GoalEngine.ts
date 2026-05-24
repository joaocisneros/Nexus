/**
 * GoalEngine — Autonomous multi-step task execution
 * Inspired by Claurst's /goal mode
 * NEXUS can break down complex objectives into steps and execute them
 */

export interface GoalStep {
  id: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  result?: string
  error?: string
  startedAt?: Date
  completedAt?: Date
}

export interface Goal {
  id: string
  objective: string
  steps: GoalStep[]
  status: 'planning' | 'executing' | 'completed' | 'failed' | 'paused' | 'cancelled'
  context: string[]
  createdAt: Date
  updatedAt: Date
  maxSteps: number
  currentStepIndex: number
}

type GoalEventCallback = (goal: Goal, step?: GoalStep) => void

export class GoalEngine {
  private goals: Map<string, Goal> = new Map()
  private listeners: Map<string, GoalEventCallback[]> = new Map()
  private abortControllers: Map<string, AbortController> = new Map()

  on(event: string, callback: GoalEventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  private emit(event: string, goal: Goal, step?: GoalStep) {
    for (const cb of this.listeners.get(event) || []) {
      cb(goal, step)
    }
  }

  /**
   * Create a new goal and plan steps using AI
   */
  async createGoal(
    objective: string,
    planner: (objective: string, context: string[]) => Promise<string[]>,
    maxSteps = 10
  ): Promise<Goal> {
    const goal: Goal = {
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      objective,
      steps: [],
      status: 'planning',
      context: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      maxSteps,
      currentStepIndex: 0,
    }

    this.goals.set(goal.id, goal)
    this.emit('created', goal)

    // Plan steps
    try {
      const stepDescriptions = await planner(objective, [])
      goal.steps = stepDescriptions.slice(0, maxSteps).map((desc, i) => ({
        id: `step-${i}`,
        description: desc,
        status: 'pending' as const,
      }))
      goal.status = 'executing'
      goal.updatedAt = new Date()
      this.emit('planned', goal)
    } catch (error) {
      goal.status = 'failed'
      goal.updatedAt = new Date()
      this.emit('failed', goal)
      throw error
    }

    return goal
  }

  /**
   * Execute the next step in a goal
   */
  async executeNextStep(
    goalId: string,
    executor: (step: GoalStep, context: string[]) => Promise<string>
  ): Promise<GoalStep | null> {
    const goal = this.goals.get(goalId)
    if (!goal || goal.status !== 'executing') return null

    const step = goal.steps.find(s => s.status === 'pending')
    if (!step) {
      goal.status = 'completed'
      goal.updatedAt = new Date()
      this.emit('completed', goal)
      return null
    }

    step.status = 'in_progress'
    step.startedAt = new Date()
    goal.updatedAt = new Date()
    this.emit('step-start', goal, step)

    const abortController = new AbortController()
    this.abortControllers.set(goalId, abortController)

    try {
      const result = await executor(step, goal.context)

      if (abortController.signal.aborted) {
        step.status = 'skipped'
        goal.updatedAt = new Date()
        this.emit('step-skipped', goal, step)
        return step
      }

      step.status = 'completed'
      step.result = result
      step.completedAt = new Date()
      goal.context.push(`Step "${step.description}" completed: ${result.slice(0, 200)}`)
      goal.currentStepIndex++
      goal.updatedAt = new Date()
      this.emit('step-completed', goal, step)
    } catch (error) {
      step.status = 'failed'
      step.error = error instanceof Error ? error.message : String(error)
      step.completedAt = new Date()
      goal.updatedAt = new Date()
      this.emit('step-failed', goal, step)
    } finally {
      this.abortControllers.delete(goalId)
    }

    return step
  }

  /**
   * Execute all remaining steps sequentially
   */
  async executeAll(
    goalId: string,
    executor: (step: GoalStep, context: string[]) => Promise<string>,
    onStepComplete?: (step: GoalStep, progress: number) => void
  ): Promise<Goal> {
    const goal = this.goals.get(goalId)
    if (!goal) throw new Error('Goal not found')

    while (goal.status === 'executing') {
      const step = await this.executeNextStep(goalId, executor)
      if (!step) break

      const progress = goal.steps.filter(s => s.status === 'completed').length / goal.steps.length
      onStepComplete?.(step, progress)

      if (step.status === 'failed') {
        goal.status = 'failed'
        goal.updatedAt = new Date()
        this.emit('failed', goal)
        break
      }
    }

    if (goal.steps.every(s => s.status === 'completed' || s.status === 'skipped')) {
      goal.status = 'completed'
      goal.updatedAt = new Date()
      this.emit('completed', goal)
    }

    return goal
  }

  /**
   * Pause execution
   */
  pause(goalId: string) {
    const goal = this.goals.get(goalId)
    if (goal && goal.status === 'executing') {
      goal.status = 'paused'
      goal.updatedAt = new Date()
      this.emit('paused', goal)
    }
  }

  /**
   * Resume execution
   */
  resume(goalId: string) {
    const goal = this.goals.get(goalId)
    if (goal && goal.status === 'paused') {
      goal.status = 'executing'
      goal.updatedAt = new Date()
      this.emit('resumed', goal)
    }
  }

  /**
   * Cancel a goal
   */
  cancel(goalId: string) {
    const goal = this.goals.get(goalId)
    if (!goal) return

    // Abort current step if running
    const controller = this.abortControllers.get(goalId)
    controller?.abort()

    goal.status = 'cancelled'
    goal.updatedAt = new Date()

    // Mark remaining steps as skipped
    for (const step of goal.steps) {
      if (step.status === 'pending' || step.status === 'in_progress') {
        step.status = 'skipped'
      }
    }

    this.emit('cancelled', goal)
  }

  getGoal(goalId: string): Goal | undefined {
    return this.goals.get(goalId)
  }

  getAllGoals(): Goal[] {
    return Array.from(this.goals.values())
  }

  getActiveGoals(): Goal[] {
    return Array.from(this.goals.values()).filter(
      g => g.status === 'executing' || g.status === 'paused'
    )
  }

  getProgress(goalId: string): { completed: number; total: number; percentage: number } {
    const goal = this.goals.get(goalId)
    if (!goal) return { completed: 0, total: 0, percentage: 0 }
    const completed = goal.steps.filter(s => s.status === 'completed').length
    return {
      completed,
      total: goal.steps.length,
      percentage: goal.steps.length > 0 ? Math.round((completed / goal.steps.length) * 100) : 0,
    }
  }
}

// Singleton
let engineInstance: GoalEngine | null = null

export function getGoalEngine(): GoalEngine {
  if (!engineInstance) {
    engineInstance = new GoalEngine()
  }
  return engineInstance
}
