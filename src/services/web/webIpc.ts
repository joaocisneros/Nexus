import { ipcMain } from 'electron'
import { WebSearchService } from './WebSearchService'

const webSearch = new WebSearchService()

export function registerWebHandlers() {
  ipcMain.handle('web:search', async (_event, query: string, maxResults?: number) => {
    try {
      const results = await webSearch.searchDuckDuckGo(query, maxResults || 5)
      return { success: true, result: results }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  })

  ipcMain.handle('web:fetch-page', async (_event, url: string) => {
    try {
      const content = await webSearch.fetchWebPage(url)
      return { success: true, result: content }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  })

  ipcMain.handle('web:wikipedia', async (_event, query: string, language?: string) => {
    try {
      const result = await webSearch.searchWikipedia(query, language)
      return { success: true, result }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  })
}
