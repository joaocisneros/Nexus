import * as https from 'https'
import * as http from 'http'
import type { WebSearchResult, WebPageContent, WikipediaResult, ContextResult } from '@/types'

export class WebSearchService {
  private cache = new Map<string, { results: WebSearchResult[]; timestamp: number }>()
  private CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  async searchDuckDuckGo(query: string, maxResults = 5): Promise<WebSearchResult[]> {
    // Check cache
    const cached = this.cache.get(query)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.results.slice(0, maxResults)
    }

    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
      const html = await this.fetchUrl(url, 30000)

      const results: WebSearchResult[] = []

      // Parse DuckDuckGo HTML results
      const resultBlocks = html.split('class="result__body"')
      for (let i = 1; i < resultBlocks.length && results.length < maxResults; i++) {
        const block = resultBlocks[i]

        // Extract title
        const titleMatch = block.match(/class="result__a"[^>]*>([^<]+)</)
        const title = titleMatch ? this.decodeHtml(titleMatch[1].trim()) : ''

        // Extract URL
        const urlMatch = block.match(/class="result__url"[^>]*>([^<]+)</)
        const resultUrl = urlMatch ? urlMatch[1].trim() : ''

        // Extract snippet
        const snippetMatch = block.match(/class="result__snippet"[^>]*>([^<]+)/)
        const snippet = snippetMatch ? this.decodeHtml(snippetMatch[1].trim()) : ''

        if (title && snippet) {
          results.push({
            title,
            snippet,
            url: resultUrl.startsWith('http') ? resultUrl : `https://${resultUrl}`,
          })
        }
      }

      // Cache results
      this.cache.set(query, { results, timestamp: Date.now() })

      return results
    } catch (error) {
      console.error('DuckDuckGo search failed:', error)
      return []
    }
  }

  async searchWikipedia(query: string, language = 'es'): Promise<WikipediaResult | null> {
    try {
      const encodedQuery = encodeURIComponent(query.replace(/\s+/g, '_'))
      const url = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodedQuery}`

      const data: Record<string, unknown> = await this.fetchJson(url, 10000)
      const contentUrls = data.content_urls as Record<string, Record<string, string>> | undefined
      const thumbnail = data.thumbnail as { source?: string } | undefined

      if (data.type === 'standard' || data.type === 'disambiguation') {
        return {
          title: (data.title as string) || query,
          extract: (data.extract as string) || '',
          url: contentUrls?.desktop?.page || `https://${language}.wikipedia.org/wiki/${encodedQuery}`,
          thumbnail: thumbnail?.source,
        }
      }

      return null
    } catch {
      // Try English as fallback
      if (language !== 'en') {
        return this.searchWikipedia(query, 'en')
      }
      return null
    }
  }

  async fetchWebPage(url: string, maxLength = 50000): Promise<WebPageContent> {
    const html = await this.fetchUrl(url, 15000)

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? this.decodeHtml(titleMatch[1].trim()) : url

    // Strip HTML tags and get text
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()

    // Truncate
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...'
    }

    return {
      url,
      title,
      text,
      fetchedAt: new Date(),
    }
  }

  shouldSearchWeb(input: string, context?: ContextResult): boolean {
    // Explicit search requests
    if (/(buscar|search|busca|encuentra|find|investiga|investigate|google|buscame)/i.test(input)) {
      return true
    }

    // Factual questions
    if (/(que\s+es|what\s+is|quien|who|donde|where|cuando|when|como|how|por\s+que|why|cual|which)/i.test(input)) {
      return true
    }

    // News and current events
    if (/(noticias|news|actual|latest|reciente|recent|hoy|today|ultimo|último)/i.test(input)) {
      return true
    }

    // Context says search
    if (context?.type === 'search') {
      return true
    }

    // Contains a URL
    if (/https?:\/\//i.test(input)) {
      return true
    }

    return false
  }

  private fetchUrl(url: string, timeout = 10000): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http

      const req = client.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
        timeout,
      }, (res) => {
        // Handle redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          this.fetchUrl(res.headers.location, timeout).then(resolve).catch(reject)
          return
        }

        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => resolve(data))
        res.on('error', reject)
      })

      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })
    })
  }

  private fetchJson(url: string, timeout = 10000): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http

      const req = client.get(url, {
        headers: {
          'User-Agent': 'NEXUS-AI/1.0 (Desktop Assistant)',
          'Accept': 'application/json',
        },
        timeout,
      }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          this.fetchJson(res.headers.location, timeout).then(resolve).catch(reject)
          return
        }

        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch {
            reject(new Error('Invalid JSON'))
          }
        })
        res.on('error', reject)
      })

      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })
    })
  }

  private decodeHtml(html: string): string {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
  }
}
