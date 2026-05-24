import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  ai: {
    chat: (messages: Array<{ role: string; content: string }>) =>
      ipcRenderer.invoke('ai:chat', messages),
    stream: (messages: Array<{ role: string; content: string }>) =>
      ipcRenderer.invoke('ai:stream', messages),
    onStreamChunk: (callback: (chunk: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, chunk: string) => callback(chunk)
      ipcRenderer.on('ai:stream-chunk', handler)
      return () => { ipcRenderer.removeListener('ai:stream-chunk', handler) }
    },
    onStreamEnd: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on('ai:stream-end', handler)
      return () => { ipcRenderer.removeListener('ai:stream-end', handler) }
    },
    onStreamError: (callback: (error: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
      ipcRenderer.on('ai:stream-error', handler)
      return () => { ipcRenderer.removeListener('ai:stream-error', handler) }
    },
  },

  brain: {
    process: (input: string, type?: string) =>
      ipcRenderer.invoke('brain:process', input, type),
    analyzeProject: (projectPath?: string) =>
      ipcRenderer.invoke('brain:analyze-project', projectPath),
    systemInfo: () =>
      ipcRenderer.invoke('brain:system-info'),
    capabilities: () =>
      ipcRenderer.invoke('brain:capabilities'),
  },

  web: {
    search: (query: string, maxResults?: number) =>
      ipcRenderer.invoke('web:search', query, maxResults),
    fetchPage: (url: string) =>
      ipcRenderer.invoke('web:fetch-page', url),
    wikipedia: (query: string, language?: string) =>
      ipcRenderer.invoke('web:wikipedia', query, language),
  },

  osint: {
    setToken: (token: string) =>
      ipcRenderer.invoke('osint:set-token', token),
    query: (input: string) =>
      ipcRenderer.invoke('osint:query', input),
    dni: (dni: string) =>
      ipcRenderer.invoke('osint:dni', dni),
    dniFull: (dni: string) =>
      ipcRenderer.invoke('osint:dni-full', dni),
    ruc: (ruc: string) =>
      ipcRenderer.invoke('osint:ruc', ruc),
    searchName: (n1: string, ap1: string, ap2: string) =>
      ipcRenderer.invoke('osint:search-name', n1, ap1, ap2),
    family: (dni: string) =>
      ipcRenderer.invoke('osint:family', dni),
    phoneDni: (dni: string) =>
      ipcRenderer.invoke('osint:phone-dni', dni),
    phoneCell: (numero: string) =>
      ipcRenderer.invoke('osint:phone-cell', numero),
    plate: (placa: string) =>
      ipcRenderer.invoke('osint:plate', placa),
  },

  // SQLite-backed memory (Claude-Mem inspired)
  memory: {
    save: (memory: { type: string; content: string; importance: number; tags: string[] }) =>
      ipcRenderer.invoke('memory:save', memory),
    search: (query: string, limit?: number) =>
      ipcRenderer.invoke('memory:search', query, limit),
    searchIndex: (query: string, limit?: number) =>
      ipcRenderer.invoke('memory:search-index', query, limit),
    details: (ids: string[]) =>
      ipcRenderer.invoke('memory:details', ids),
    all: () =>
      ipcRenderer.invoke('memory:all'),
    recent: (limit?: number) =>
      ipcRenderer.invoke('memory:recent', limit),
    byType: (type: string) =>
      ipcRenderer.invoke('memory:by-type', type),
    count: () =>
      ipcRenderer.invoke('memory:count'),
    delete: (id: string) =>
      ipcRenderer.invoke('memory:delete', id),
    clear: () =>
      ipcRenderer.invoke('memory:clear'),
    knowledgeGraph: () =>
      ipcRenderer.invoke('memory:knowledge-graph'),
  },

  // Workflow engine (n8n-inspired)
  workflow: {
    templates: () =>
      ipcRenderer.invoke('workflow:templates'),
    create: (templateIndex: number) =>
      ipcRenderer.invoke('workflow:create', templateIndex),
    execute: (workflowId: string, input?: string) =>
      ipcRenderer.invoke('workflow:execute', workflowId, input),
    list: () =>
      ipcRenderer.invoke('workflow:list'),
    get: (id: string) =>
      ipcRenderer.invoke('workflow:get', id),
  },

  // Goal engine (ACP-inspired)
  goal: {
    start: (objective: string) =>
      ipcRenderer.invoke('goal:start', objective),
    executeNext: (goalId: string) =>
      ipcRenderer.invoke('goal:execute-next', goalId),
    executeAll: (goalId: string) =>
      ipcRenderer.invoke('goal:execute-all', goalId),
    pause: (goalId: string) =>
      ipcRenderer.invoke('goal:pause', goalId),
    resume: (goalId: string) =>
      ipcRenderer.invoke('goal:resume', goalId),
    cancel: (goalId: string) =>
      ipcRenderer.invoke('goal:cancel', goalId),
    get: (goalId: string) =>
      ipcRenderer.invoke('goal:get', goalId),
    list: () =>
      ipcRenderer.invoke('goal:list'),
    active: () =>
      ipcRenderer.invoke('goal:active'),
    progress: (goalId: string) =>
      ipcRenderer.invoke('goal:progress', goalId),
  },

  // Image prompt catalog
  imagePrompts: {
    all: () =>
      ipcRenderer.invoke('image-prompts:all'),
    categories: () =>
      ipcRenderer.invoke('image-prompts:categories'),
    byCategory: (category: string) =>
      ipcRenderer.invoke('image-prompts:by-category', category),
    search: (query: string) =>
      ipcRenderer.invoke('image-prompts:search', query),
    get: (id: string) =>
      ipcRenderer.invoke('image-prompts:get', id),
    fill: (promptId: string, variables: Record<string, string>) =>
      ipcRenderer.invoke('image-prompts:fill', promptId, variables),
  },

  // gitlawb — decentralized git network
  gitlawb: {
    // Identity
    identityGet: () =>
      ipcRenderer.invoke('gitlawb:identity-get'),
    identityCreate: (alias?: string) =>
      ipcRenderer.invoke('gitlawb:identity-create', alias),

    // Connection
    connect: () =>
      ipcRenderer.invoke('gitlawb:connect'),
    disconnect: () =>
      ipcRenderer.invoke('gitlawb:disconnect'),
    status: () =>
      ipcRenderer.invoke('gitlawb:status'),

    // Repos
    repoCreate: (name: string, description: string) =>
      ipcRenderer.invoke('gitlawb:repo-create', name, description),
    repoList: () =>
      ipcRenderer.invoke('gitlawb:repo-list'),

    // Agents
    agentRegister: (capabilities: string[]) =>
      ipcRenderer.invoke('gitlawb:agent-register', capabilities),
    agentList: () =>
      ipcRenderer.invoke('gitlawb:agent-list'),

    // MCP Tools
    exposeTools: () =>
      ipcRenderer.invoke('gitlawb:expose-tools'),
    toolList: () =>
      ipcRenderer.invoke('gitlawb:tool-list'),

    // Memory IPFS
    memoryPersist: (repoName: string, memories: unknown[]) =>
      ipcRenderer.invoke('gitlawb:memory-persist', repoName, memories),
    memoryLoad: (repoName: string) =>
      ipcRenderer.invoke('gitlawb:memory-load', repoName),

    // Tasks
    taskDelegate: (targetDid: string, task: string, capabilities: string[]) =>
      ipcRenderer.invoke('gitlawb:task-delegate', targetDid, task, capabilities),
    taskReport: (taskId: string, result: unknown) =>
      ipcRenderer.invoke('gitlawb:task-report', taskId, result),

    // Events
    subscribeEvents: () =>
      ipcRenderer.invoke('gitlawb:subscribe-events'),
    onEvent: (callback: (event: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
      ipcRenderer.on('gitlawb:event', handler)
      return () => { ipcRenderer.removeListener('gitlawb:event', handler) }
    },
  },
})
