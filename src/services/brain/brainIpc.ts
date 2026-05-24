import { ipcMain } from 'electron'
import { QueryRouter } from './QueryRouter'
import { LocalBrain } from './LocalBrain'
import type { SystemCapabilities } from '@/types'

let queryRouter: QueryRouter | null = null
const localBrain = new LocalBrain()

function getCapabilities(): SystemCapabilities {
  return {
    aiAvailable: !!(process.env.OPENAI_API_KEY || process.env.OPENGATEWAY_API_KEY),
    webAvailable: true,
    localCapabilities: ['greeting', 'system', 'project', 'file'],
  }
}

function getRouter(): QueryRouter {
  // Always create fresh router to pick up latest capabilities
  queryRouter = new QueryRouter(getCapabilities())
  return queryRouter
}

export function registerBrainHandlers() {
  ipcMain.handle('brain:process', async (_event, input: string, type?: string) => {
    try {
      const r = getRouter()
      const decision = await r.route(input, type)
      const result = await r.execute(input, decision)
      return { success: true, result }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  })

  ipcMain.handle('brain:analyze-project', async (_event, projectPath?: string) => {
    try {
      const analysis = localBrain.analyzeProject(projectPath || process.cwd())
      return { success: true, result: analysis }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  })

  ipcMain.handle('brain:system-info', async () => {
    try {
      const info = localBrain.getSystemInfo()
      return { success: true, result: info }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  })

  ipcMain.handle('brain:capabilities', async () => {
    try {
      const caps = getCapabilities()
      return { success: true, result: caps }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  })
}
