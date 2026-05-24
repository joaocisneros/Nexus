/**
 * GoalEngine IPC — ACP-inspired autonomous goal execution
 * Registers IPC handlers for goal management
 */

import { ipcMain } from 'electron'
import { getGoalEngine } from './GoalEngine'
import { aiChat } from '../ai/aiIpc'
import { SYSTEM_GOAL_PLANNING, buildGoalStepPrompt } from '../prompts/NexusPrompts'

export function registerGoalHandlers() {
  const engine = getGoalEngine()

  ipcMain.handle('goal:start', async (_event, objective: string) => {
    try {
      const goal = await engine.createGoal(
        objective,
        async (obj) => {
          const response = await aiChat([
            {
              role: 'system',
              content: SYSTEM_GOAL_PLANNING,
            },
            { role: 'user', content: `Objetivo: ${obj}` },
          ])
          const jsonMatch = response.match(/\[[\s\S]*?\]/)
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as string[]
          }
          return [obj]
        }
      )
      return { success: true, result: goal }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('goal:execute-next', async (_event, goalId: string) => {
    try {
      const step = await engine.executeNextStep(goalId, async (step, context) => {
        const contextStr = context.length > 0 ? context.join('\n') : undefined
        const goal = engine.getGoal(goalId)
        const response = await aiChat([
          {
            role: 'system',
            content: buildGoalStepPrompt(goal?.objective || 'Objetivo desconocido', contextStr),
          },
          { role: 'user', content: `Ejecuta: ${step.description}` },
        ])
        return response
      })
      return { success: true, result: step }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('goal:execute-all', async (_event, goalId: string) => {
    try {
      const goal = await engine.executeAll(
        goalId,
        async (step, context) => {
          const contextStr = context.length > 0 ? context.join('\n') : undefined
          const goalData = engine.getGoal(goalId)
          const response = await aiChat([
            {
              role: 'system',
              content: buildGoalStepPrompt(goalData?.objective || 'Objetivo desconocido', contextStr),
            },
            { role: 'user', content: `Ejecuta: ${step.description}` },
          ])
          return response
        }
      )
      return { success: true, result: goal }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('goal:pause', async (_event, goalId: string) => {
    engine.pause(goalId)
    return { success: true }
  })

  ipcMain.handle('goal:resume', async (_event, goalId: string) => {
    engine.resume(goalId)
    return { success: true }
  })

  ipcMain.handle('goal:cancel', async (_event, goalId: string) => {
    engine.cancel(goalId)
    return { success: true }
  })

  ipcMain.handle('goal:get', async (_event, goalId: string) => {
    const goal = engine.getGoal(goalId)
    return goal
      ? { success: true, result: goal }
      : { success: false, error: 'Goal not found' }
  })

  ipcMain.handle('goal:list', async () => {
    return { success: true, result: engine.getAllGoals() }
  })

  ipcMain.handle('goal:active', async () => {
    return { success: true, result: engine.getActiveGoals() }
  })

  ipcMain.handle('goal:progress', async (_event, goalId: string) => {
    return { success: true, result: engine.getProgress(goalId) }
  })
}
