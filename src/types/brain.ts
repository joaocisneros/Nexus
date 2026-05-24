// Local brain result
export interface LocalBrainResult {
  content: string
  confidence: number // 0-1
  source: 'greeting' | 'system' | 'project' | 'file' | 'template'
  data?: Record<string, unknown>
}

// Web search result from DuckDuckGo
export interface WebSearchResult {
  title: string
  snippet: string
  url: string
}

// Web page content after fetching
export interface WebPageContent {
  url: string
  title: string
  text: string
  fetchedAt: Date
}

// Wikipedia summary
export interface WikipediaResult {
  title: string
  extract: string
  url: string
  thumbnail?: string
}

// Routing decision
export type LayerType = 'local' | 'web' | 'ai' | 'osint' | 'workflow' | 'goal' | 'memory' | 'image' | 'gitlawb'

export interface RoutingDecision {
  layers: LayerType[]
  reason: string
  localResult?: LocalBrainResult
}

// System capabilities
export interface SystemCapabilities {
  aiAvailable: boolean
  webAvailable: boolean
  gitlawbAvailable?: boolean
  localCapabilities: string[]
}

// Unified brain response
export interface BrainResponse {
  result: string
  reasoning: string
  source: 'local' | 'web' | 'ai' | 'web+ai' | 'web+local'
  webResults?: WebSearchResult[]
  context: {
    relevantMemories: number
    knowledgeNodes: number
    processingTime: number
    layer: LayerType[]
    error?: boolean
  }
}

// Project analysis result
export interface ProjectAnalysis {
  path: string
  totalFiles: number
  totalLines: number
  languages: Record<string, number>
  frameworks: string[]
  packageJson?: {
    name?: string
    version?: string
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  structure: string
}

// System info
export interface SystemInfo {
  platform: string
  arch: string
  nodeVersion: string
  electronVersion: string
  uptime: number
  totalMemory: number
  freeMemory: number
  cpus: number
}
