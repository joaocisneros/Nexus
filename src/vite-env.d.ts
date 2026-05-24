/// <reference types="vite/client" />

interface ElectronAI {
  chat(messages: Array<{ role: string; content: string }>): Promise<{ success: boolean; result?: string; error?: string }>
  stream(messages: Array<{ role: string; content: string }>): Promise<{ success: boolean; error?: string }>
  onStreamChunk(callback: (chunk: string) => void): () => void
  onStreamEnd(callback: () => void): () => void
  onStreamError(callback: (error: string) => void): () => void
}

interface ElectronBrain {
  process(input: string, type?: string): Promise<{ success: boolean; result?: import('./types').BrainResponse; error?: string }>
  analyzeProject(projectPath?: string): Promise<{ success: boolean; result?: import('./types').ProjectAnalysis; error?: string }>
  systemInfo(): Promise<{ success: boolean; result?: import('./types').SystemInfo; error?: string }>
  capabilities(): Promise<{ success: boolean; result?: import('./types').SystemCapabilities; error?: string }>
}

interface ElectronWeb {
  search(query: string, maxResults?: number): Promise<{ success: boolean; result?: import('./types').WebSearchResult[]; error?: string }>
  fetchPage(url: string): Promise<{ success: boolean; result?: import('./types').WebPageContent; error?: string }>
  wikipedia(query: string, language?: string): Promise<{ success: boolean; result?: import('./types').WikipediaResult | null; error?: string }>
}

interface ElectronOSINT {
  setToken(token: string): Promise<{ success: boolean }>
  query(input: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  dni(dni: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  dniFull(dni: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  ruc(ruc: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  searchName(n1: string, ap1: string, ap2: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  family(dni: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  phoneDni(dni: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  phoneCell(numero: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  plate(placa: string): Promise<{ success: boolean; result?: unknown; error?: string }>
}

interface ElectronMemory {
  save(memory: { type: string; content: string; importance: number; tags: string[] }): Promise<{ success: boolean; result?: unknown; error?: string }>
  search(query: string, limit?: number): Promise<{ success: boolean; result?: unknown; error?: string }>
  searchIndex(query: string, limit?: number): Promise<{ success: boolean; result?: unknown; error?: string }>
  details(ids: string[]): Promise<{ success: boolean; result?: unknown; error?: string }>
  all(): Promise<{ success: boolean; result?: unknown; error?: string }>
  recent(limit?: number): Promise<{ success: boolean; result?: unknown; error?: string }>
  byType(type: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  count(): Promise<{ success: boolean; result?: unknown; error?: string }>
  delete(id: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  clear(): Promise<{ success: boolean; result?: unknown; error?: string }>
  knowledgeGraph(): Promise<{ success: boolean; result?: unknown; error?: string }>
}

interface ElectronWorkflow {
  templates(): Promise<{ success: boolean; result?: unknown; error?: string }>
  create(templateIndex: number): Promise<{ success: boolean; result?: unknown; error?: string }>
  execute(workflowId: string, input?: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  list(): Promise<{ success: boolean; result?: unknown; error?: string }>
  get(id: string): Promise<{ success: boolean; result?: unknown; error?: string }>
}

interface ElectronGoal {
  start(objective: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  executeNext(goalId: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  executeAll(goalId: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  pause(goalId: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  resume(goalId: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  cancel(goalId: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  get(goalId: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  list(): Promise<{ success: boolean; result?: unknown; error?: string }>
  active(): Promise<{ success: boolean; result?: unknown; error?: string }>
  progress(goalId: string): Promise<{ success: boolean; result?: unknown; error?: string }>
}

interface ElectronImagePrompts {
  all(): Promise<{ success: boolean; result?: unknown; error?: string }>
  categories(): Promise<{ success: boolean; result?: unknown; error?: string }>
  byCategory(category: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  search(query: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  get(id: string): Promise<{ success: boolean; result?: unknown; error?: string }>
  fill(promptId: string, variables: Record<string, string>): Promise<{ success: boolean; result?: unknown; error?: string }>
}

interface ElectronGitlawb {
  identityGet(): Promise<{ success: boolean; result?: import('./types').GitlawbIdentity | null; error?: string }>
  identityCreate(alias?: string): Promise<{ success: boolean; result?: import('./types').GitlawbIdentity | null; error?: string }>
  connect(): Promise<{ success: boolean; result?: import('./types').GitlawbStatus; error?: string }>
  disconnect(): Promise<{ success: boolean; error?: string }>
  status(): Promise<{ success: boolean; result?: import('./types').GitlawbStatus; error?: string }>
  repoCreate(name: string, description: string): Promise<{ success: boolean; result?: import('./types').GitlawbRepo; error?: string }>
  repoList(): Promise<{ success: boolean; result?: import('./types').GitlawbRepo[]; error?: string }>
  agentRegister(capabilities: string[]): Promise<{ success: boolean; result?: import('./types').GitlawbAgent[]; error?: string }>
  agentList(): Promise<{ success: boolean; result?: import('./types').GitlawbAgent[]; error?: string }>
  exposeTools(): Promise<{ success: boolean; result?: import('./types').GitlawbMCPTool[]; error?: string }>
  toolList(): Promise<{ success: boolean; result?: import('./types').GitlawbMCPTool[]; error?: string }>
  memoryPersist(repoName: string, memories: unknown[]): Promise<{ success: boolean; error?: string }>
  memoryLoad(repoName: string): Promise<{ success: boolean; result?: unknown[]; error?: string }>
  taskDelegate(targetDid: string, task: string, capabilities: string[]): Promise<{ success: boolean; result?: string; error?: string }>
  taskReport(taskId: string, result: unknown): Promise<{ success: boolean; error?: string }>
  subscribeEvents(): Promise<{ success: boolean; error?: string }>
  onEvent(callback: (event: import('./types').GitlawbEvent) => void): () => void
}

interface ElectronAPI {
  getAppVersion(): Promise<string>
  ai: ElectronAI
  brain: ElectronBrain
  web: ElectronWeb
  osint: ElectronOSINT
  memory: ElectronMemory
  workflow: ElectronWorkflow
  goal: ElectronGoal
  imagePrompts: ElectronImagePrompts
  gitlawb: ElectronGitlawb
}

interface Window {
  electron: ElectronAPI
}

interface ImportMetaEnv {
  readonly VITE_OPENAI_MODEL: string
  readonly VITE_OLLAMA_HOST: string
  readonly VITE_ENABLE_BACKGROUND_LEARNING: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Web Speech API types
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: Event) => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

interface Window {
  SpeechRecognition: SpeechRecognitionConstructor
  webkitSpeechRecognition: SpeechRecognitionConstructor
}
