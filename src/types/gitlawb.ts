export interface GitlawbConfig {
  nodeUrl: string
  token?: string
  identityPath?: string
}

export interface GitlawbIdentity {
  did: string
  publicKey: string
  createdAt: string
  trustScore?: number
  alias?: string
}

export interface GitlawbNodeInfo {
  url: string
  version: string
  peers: number
  repos: number
  agents: number
  uptime: string
}

export interface GitlawbStatus {
  connected: boolean
  identity: GitlawbIdentity | null
  node: GitlawbNodeInfo | null
  lastSync: string | null
  error: string | null
}

export interface GitlawbRepo {
  id: string
  name: string
  description: string
  owner: string
  refs: number
  lastCommit: string
  createdAt: string
}

export interface GitlawbAgent {
  did: string
  capabilities: string[]
  trustScore: number
  lastSeen: string
  status?: 'online' | 'offline' | 'busy'
  alias?: string
}

export interface GitlawbEvent {
  type: 'CommitPushed' | 'PullRequestOpened' | 'IssueOpened' | 'TaskBroadcast' | 'AgentJoined' | 'RefUpdated'
  timestamp: string
  data: Record<string, unknown>
}

export interface GitlawbMCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}
