import type {
  GitlawbConfig,
  GitlawbIdentity,
  GitlawbNodeInfo,
  GitlawbStatus,
  GitlawbRepo,
  GitlawbAgent,
  GitlawbEvent,
  GitlawbMCPTool,
} from '@/types/gitlawb'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { app } from 'electron'

const DEFAULT_NODE = 'https://node.gitlawb.com'

let config: GitlawbConfig = { nodeUrl: DEFAULT_NODE }
let identity: GitlawbIdentity | null = null
let connected = false
let lastSync: string | null = null
let eventSubscribers: Array<(event: GitlawbEvent) => void> = []

function getIdentityPath(): string {
  const userData = app.getPath('userData')
  return path.join(userData, 'gitlawb-identity.json')
}

function generateEd25519Keypair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  })
  return {
    publicKey: publicKey.toString('base64'),
    privateKey: privateKey.toString('base64'),
  }
}

function publicKeyToDID(publicKeyDer: string): string {
  const der = Buffer.from(publicKeyDer, 'base64')
  // Extract raw 32-byte public key from DER (last 32 bytes for Ed25519)
  const raw = der.subarray(der.length - 32)
  // Multicodec prefix for Ed25519 public key: 0xed01
  const multicodec = Buffer.concat([Buffer.from([0xed, 0x01]), raw])
  // Base58-like encoding (simplified z-encoding)
  const b64 = multicodec.toString('base64url')
  return `did:key:z${b64}`
}

async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<unknown> {
  const url = `${config.nodeUrl}${endpoint}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`
  }
  if (identity) {
    headers['X-Gitlawb-DID'] = identity.did
  }

  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`gitlawb API ${res.status}: ${body || res.statusText}`)
  }
  return res.json()
}

// --- Public API ---

export async function initialize(userConfig?: Partial<GitlawbConfig>): Promise<GitlawbStatus> {
  if (userConfig) {
    config = { ...config, ...userConfig }
  }

  // Load or generate identity
  try {
    const idPath = getIdentityPath()
    if (fs.existsSync(idPath)) {
      const saved = JSON.parse(fs.readFileSync(idPath, 'utf-8'))
      identity = saved
    } else {
      const kp = generateEd25519Keypair()
      const did = publicKeyToDID(kp.publicKey)
      identity = {
        did,
        publicKey: kp.publicKey,
        createdAt: new Date().toISOString(),
      }
      fs.writeFileSync(idPath, JSON.stringify(identity, null, 2))
    }
  } catch (err) {
    console.error('[gitlawb] Identity error:', err)
  }

  // Test connection
  try {
    const info = await getNodeInfo()
    connected = true
    return {
      connected: true,
      identity,
      node: info,
      lastSync,
      error: null,
    }
  } catch (err) {
    connected = false
    return {
      connected: false,
      identity,
      node: null,
      lastSync,
      error: (err as Error).message,
    }
  }
}

export function getIdentity(): GitlawbIdentity | null {
  return identity
}

export function isConnected(): boolean {
  return connected
}

export function disconnect(): void {
  connected = false
  lastSync = null
  eventSubscribers = []
}

export function setIdentity(newIdentity: GitlawbIdentity): void {
  identity = newIdentity
  // Persist to disk
  try {
    const fs = require('fs')
    const identityPath = getIdentityPath()
    fs.writeFileSync(identityPath, JSON.stringify(newIdentity, null, 2))
  } catch { /* ignore write errors */ }
}

export async function getNodeInfo(): Promise<GitlawbNodeInfo> {
  const data = await apiRequest('/') as Record<string, unknown>
  return {
    url: config.nodeUrl,
    version: (data.version as string) || 'unknown',
    peers: (data.peers as number) || 0,
    repos: (data.repos as number) || 0,
    agents: (data.agents as number) || 0,
    uptime: (data.uptime as string) || 'unknown',
  }
}

export async function getStatus(): Promise<GitlawbStatus> {
  let node: GitlawbNodeInfo | null = null
  let error: string | null = null

  try {
    node = await getNodeInfo()
    connected = true
  } catch (err) {
    connected = false
    error = (err as Error).message
  }

  return { connected, identity, node, lastSync, error }
}

// --- Repos ---

export async function listRepos(): Promise<GitlawbRepo[]> {
  const data = await apiRequest('/repos') as { repos: GitlawbRepo[] }
  return data.repos || []
}

export async function createRepo(name: string, description: string): Promise<GitlawbRepo> {
  const data = await apiRequest('/repos', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  }) as GitlawbRepo
  return data
}

// --- Agents ---

export async function listAgents(capabilities?: string[]): Promise<GitlawbAgent[]> {
  const params = capabilities ? `?capabilities=${capabilities.join(',')}` : ''
  const data = await apiRequest(`/agents${params}`) as { agents: GitlawbAgent[] }
  return data.agents || []
}

export async function getAgentTrustScore(did: string): Promise<number> {
  const data = await apiRequest(`/agents/${encodeURIComponent(did)}/trust`) as { trustScore: number }
  return data.trustScore || 0
}

export async function registerAgent(capabilities: string[], alias?: string): Promise<GitlawbAgent> {
  const data = await apiRequest('/agents/register', {
    method: 'POST',
    body: JSON.stringify({
      did: identity?.did,
      alias: alias || identity?.alias || 'NEXUS',
      capabilities,
    }),
  }) as { agent: GitlawbAgent }
  return data.agent
}

// --- Memory Sync ---

export async function pushMemory(repoName: string, memories: unknown[]): Promise<void> {
  await apiRequest(`/repos/${repoName}/memory`, {
    method: 'POST',
    body: JSON.stringify({ memories, timestamp: new Date().toISOString() }),
  })
  lastSync = new Date().toISOString()
}

export async function pullMemory(repoName: string): Promise<unknown[]> {
  const data = await apiRequest(`/repos/${repoName}/memory`) as { memories: unknown[] }
  lastSync = new Date().toISOString()
  return data.memories || []
}

// --- MCP Server ---

export async function getMCPTools(): Promise<GitlawbMCPTool[]> {
  const data = await apiRequest('/mcp/tools') as { tools: GitlawbMCPTool[] }
  return data.tools || []
}

export async function callMCPTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const data = await apiRequest('/mcp/call', {
    method: 'POST',
    body: JSON.stringify({ tool: toolName, arguments: args }),
  })
  return data
}

// --- Events ---

export function subscribeToEvents(callback: (event: GitlawbEvent) => void): () => void {
  eventSubscribers.push(callback)
  return () => {
    eventSubscribers = eventSubscribers.filter(cb => cb !== callback)
  }
}

export function emitEvent(event: GitlawbEvent): void {
  for (const cb of eventSubscribers) {
    try { cb(event) } catch { /* ignore */ }
  }
}

// --- Task Delegation ---

export async function delegateTask(targetDid: string, task: string, capabilities: string[]): Promise<string> {
  const data = await apiRequest('/tasks/delegate', {
    method: 'POST',
    body: JSON.stringify({ targetDid, task, capabilities }),
  }) as { taskId: string }
  return data.taskId
}

export async function reportTaskResult(taskId: string, result: unknown): Promise<void> {
  await apiRequest(`/tasks/${taskId}/result`, {
    method: 'POST',
    body: JSON.stringify({ result, timestamp: new Date().toISOString() }),
  })
}
