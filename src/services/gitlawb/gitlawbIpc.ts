import { ipcMain } from 'electron'
import * as GitlawbService from './GitlawbService'

let eventUnsubscribe: (() => void) | null = null

export function registerGitlawbHandlers() {
  // === Identity ===
  ipcMain.handle('gitlawb:identity-get', async () => {
    try {
      const identity = GitlawbService.getIdentity()
      return { success: true, result: identity }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('gitlawb:identity-create', async (_event, alias?: string) => {
    try {
      const existing = GitlawbService.getIdentity()
      if (existing) {
        if (alias) {
          const updated = { ...existing, alias }
          GitlawbService.setIdentity(updated)
          return { success: true, result: updated }
        }
        return { success: true, result: existing }
      }
      // Generate new identity via initialize
      await GitlawbService.initialize()
      const newIdentity = GitlawbService.getIdentity()
      if (newIdentity && alias) {
        GitlawbService.setIdentity({ ...newIdentity, alias })
      }
      return { success: true, result: GitlawbService.getIdentity() }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // === Connection ===
  ipcMain.handle('gitlawb:connect', async () => {
    try {
      const status = await GitlawbService.initialize()
      return { success: status.connected, result: status }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('gitlawb:disconnect', async () => {
    try {
      GitlawbService.disconnect()
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('gitlawb:status', async () => {
    try {
      const status = await GitlawbService.getStatus()
      return { success: true, result: status }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // === Repos ===
  ipcMain.handle('gitlawb:repo-create', async (_event, name: string, description: string) => {
    try {
      const repo = await GitlawbService.createRepo(name, description)
      return { success: true, result: repo }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('gitlawb:repo-list', async () => {
    try {
      const repos = await GitlawbService.listRepos()
      return { success: true, result: repos }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // === Agents ===
  ipcMain.handle('gitlawb:agent-register', async (_event, capabilities: string[]) => {
    try {
      const agent = await GitlawbService.registerAgent(capabilities)
      return { success: true, result: agent }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('gitlawb:agent-list', async () => {
    try {
      const agents = await GitlawbService.listAgents()
      return { success: true, result: agents }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // === MCP Tools ===
  ipcMain.handle('gitlawb:expose-tools', async () => {
    try {
      const tools = await GitlawbService.getMCPTools()
      return { success: true, result: tools }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('gitlawb:tool-list', async () => {
    try {
      const tools = await GitlawbService.getMCPTools()
      return { success: true, result: tools }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // === Memory IPFS ===
  ipcMain.handle('gitlawb:memory-persist', async (_event, repoName: string, memories: unknown[]) => {
    try {
      await GitlawbService.pushMemory(repoName, memories)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('gitlawb:memory-load', async (_event, repoName: string) => {
    try {
      const memories = await GitlawbService.pullMemory(repoName)
      return { success: true, result: memories }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // === Tasks ===
  ipcMain.handle('gitlawb:task-delegate', async (_event, targetDid: string, task: string, capabilities: string[]) => {
    try {
      const taskId = await GitlawbService.delegateTask(targetDid, task, capabilities)
      return { success: true, result: taskId }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('gitlawb:task-report', async (_event, taskId: string, result: unknown) => {
    try {
      await GitlawbService.reportTaskResult(taskId, result)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // === Events ===
  // Use event.sender.send() to push events to renderer (functions can't cross IPC)
  ipcMain.handle('gitlawb:subscribe-events', async (event) => {
    try {
      // Clean up previous subscription if any
      if (eventUnsubscribe) {
        eventUnsubscribe()
        eventUnsubscribe = null
      }

      const webContents = event.sender
      eventUnsubscribe = GitlawbService.subscribeToEvents((gitlawbEvent) => {
        if (!webContents.isDestroyed()) {
          webContents.send('gitlawb:event', gitlawbEvent)
        }
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
}
