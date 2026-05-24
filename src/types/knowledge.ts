export interface KGNode {
  id: string
  label: string
  frequency: number
  firstSeen: Date
  lastSeen: Date
}

export interface KGEdge {
  source: string
  target: string
  weight: number
}

export interface KGEnrichment {
  nodes: Array<{ label: string; frequency: number }>
  relatedConcepts: string[]
}
