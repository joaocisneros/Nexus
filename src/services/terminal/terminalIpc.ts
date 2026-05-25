/**
 * Terminal IPC — Real shell execution via child_process
 */

import { ipcMain } from 'electron'
import { spawn, exec } from 'child_process'
import type { ChildProcess } from 'child_process'

let activeShell: ChildProcess | null = null

export function registerTerminalHandlers() {
  // Execute a single command
  ipcMain.handle('terminal:exec', async (_event, command: string) => {
    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32'
      const shell = isWindows ? 'cmd.exe' : 'bash'
      const shellArgs = isWindows ? ['/c', command] : ['-c', command]

      const child = spawn(shell, shellArgs, {
        cwd: process.cwd(),
        env: process.env,
        shell: false,
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code,
        })
      })

      child.on('error', (err) => {
        resolve({
          success: false,
          stdout: '',
          stderr: err.message,
          exitCode: 1,
        })
      })
    })
  })

  // Stream output from a long-running command
  ipcMain.on('terminal:spawn', (event, command: string) => {
    const isWindows = process.platform === 'win32'
    const shell = isWindows ? 'cmd.exe' : 'bash'
    const shellArgs = isWindows ? ['/c', command] : ['-c', command]

    const child = spawn(shell, shellArgs, {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
    })

    child.stdout.on('data', (data: Buffer) => {
      event.sender.send('terminal:stdout', data.toString())
    })

    child.stderr.on('data', (data: Buffer) => {
      event.sender.send('terminal:stderr', data.toString())
    })

    child.on('close', (code) => {
      event.sender.send('terminal:exit', code)
    })

    child.on('error', (err) => {
      event.sender.send('terminal:stderr', err.message)
      event.sender.send('terminal:exit', 1)
    })
  })

  // Get current working directory
  ipcMain.handle('terminal:cwd', async () => {
    return process.cwd()
  })
}
