import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { initializeAI, aiChat, aiStream } from './services/ai/aiIpc'
import { registerBrainHandlers } from './services/brain/brainIpc'
import { registerWebHandlers } from './services/web/webIpc'
import { registerOSINTHandlers } from './services/osint/osintIpc'
import { registerMemoryHandlers } from './services/memory/memoryIpc'
import { registerWorkflowHandlers } from './services/workflow/WorkflowEngine'
import { registerGoalHandlers } from './services/goal/goalIpc'
import { registerImagePromptHandlers } from './services/image/ImagePromptService'
import { registerGitlawbHandlers } from './services/gitlawb/gitlawbIpc'
import type { AIMessage } from './types'

// eslint-disable-next-line @typescript-eslint/no-var-requires
declare const __dirname: string

let mainWindow: BrowserWindow | null = null

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    titleBarStyle: 'hiddenInset',
    frame: true,
    transparent: false,
    backgroundColor: '#0a0a0a',
    show: false,
  })

  // Load React app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000')
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  // Initialize AI service with environment variables
  initializeAI({
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
    openGatewayKey: process.env.OPENGATEWAY_API_KEY || '',
    openGatewayUrl: process.env.OPENGATEWAY_URL || 'https://opengateway.gitlawb.com/v1',
    openGatewayModel: process.env.OPENGATEWAY_MODEL || 'mimo-v2-pro',
  })

  // Register all IPC handlers
  registerBrainHandlers()
  registerWebHandlers()
  registerOSINTHandlers()
  registerMemoryHandlers()
  registerWorkflowHandlers()
  registerGoalHandlers()
  registerImagePromptHandlers()
  registerGitlawbHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  mainWindow?.destroy()
})

// IPC handlers
ipcMain.handle('get-app-version', () => app.getVersion())

// AI IPC handlers (API key stays in main process)
ipcMain.handle('ai:chat', async (_event, messages: AIMessage[]) => {
  try {
    const result = await aiChat(messages)
    return { success: true, result }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
})

ipcMain.handle('ai:stream', async (event, messages: AIMessage[]) => {
  try {
    await aiStream(messages, (chunk) => {
      event.sender.send('ai:stream-chunk', chunk)
    })
    event.sender.send('ai:stream-end')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    event.sender.send('ai:stream-error', message)
    return { success: false, error: message }
  }
})
