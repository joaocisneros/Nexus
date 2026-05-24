import { ipcMain } from 'electron'
import {
  setOSINTToken,
  smartQuery,
  queryDNI,
  queryDNIFull,
  queryRUC,
  searchByName,
  queryFamilyGraph,
  queryPhoneByDNI,
  queryPhoneByCell,
  queryPlate,
} from './OSSINTService'

export function registerOSINTHandlers() {
  ipcMain.handle('osint:set-token', async (_event, token: string) => {
    setOSINTToken(token)
    return { success: true }
  })

  ipcMain.handle('osint:query', async (_event, input: string) => {
    try {
      const result = await smartQuery(input)
      return { success: true, result }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  })

  ipcMain.handle('osint:dni', async (_event, dni: string) => {
    try {
      return { success: true, result: await queryDNI(dni) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('osint:dni-full', async (_event, dni: string) => {
    try {
      return { success: true, result: await queryDNIFull(dni) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('osint:ruc', async (_event, ruc: string) => {
    try {
      return { success: true, result: await queryRUC(ruc) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('osint:search-name', async (_event, n1: string, ap1: string, ap2: string) => {
    try {
      return { success: true, result: await searchByName(n1, ap1, ap2) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('osint:family', async (_event, dni: string) => {
    try {
      return { success: true, result: await queryFamilyGraph(dni) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('osint:phone-dni', async (_event, dni: string) => {
    try {
      return { success: true, result: await queryPhoneByDNI(dni) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('osint:phone-cell', async (_event, numero: string) => {
    try {
      return { success: true, result: await queryPhoneByCell(numero) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('osint:plate', async (_event, placa: string) => {
    try {
      return { success: true, result: await queryPlate(placa) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
}
