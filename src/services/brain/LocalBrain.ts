import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { LocalBrainResult, ProjectAnalysis, SystemInfo } from '@/types'

export class LocalBrain {

  async handle(input: string): Promise<LocalBrainResult | null> {
    const lower = input.toLowerCase().trim()

    // 1. Greetings
    const greeting = this.handleGreeting(lower)
    if (greeting) return { content: greeting, confidence: 0.95, source: 'greeting' }

    // 2. System commands
    const system = this.handleSystemCommand(lower)
    if (system) return { content: system, confidence: 0.9, source: 'system' }

    // 3. Project analysis
    const project = await this.handleProjectAnalysis(lower, input)
    if (project) return { content: project.content, confidence: 0.85, source: 'project', data: project.data }

    // 4. File operations
    const file = await this.handleFileOperation(lower, input)
    if (file) return { content: file, confidence: 0.8, source: 'file' }

    return null
  }

  private handleGreeting(input: string): string | null {
    const patterns = [
      /^(hola|hello|hi|hey|buenos\s*dias|buenas|saludos|que\s*tal|good\s*(morning|afternoon|evening)|como\s*estas|que\s*onda|ey)/i,
    ]

    for (const p of patterns) {
      if (p.test(input)) {
        const responses = [
          '¡Hola! Soy **NEXUS**, tu asistente de IA personal. ¿En qué puedo ayudarte hoy?\n\nPuedo:\n- Responder preguntas buscando en internet\n- Analizar tu proyecto\n- Leer y explicar archivos\n- Buscar información en Wikipedia\n- Y mucho más...',
          '¡Hey! 👋 Estoy aquí para ayudarte. Puedo buscar información, analizar código, leer archivos, o simplemente conversar. ¿Qué necesitas?',
          '¡Buenas! NEXUS a tu servicio. Tengo acceso a internet, puedo analizar proyectos, y aprender de nuestras conversaciones. ¿Por dónde empezamos?',
        ]
        return responses[Math.floor(Math.random() * responses.length)]
      }
    }
    return null
  }

  private handleSystemCommand(input: string): string | null {
    // Date/time
    if (/(fecha|hora|time|date|dia|today|now|ahora)/i.test(input)) {
      const now = new Date()
      return `**Fecha y hora actual:**\n\n- **Fecha:** ${now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n- **Hora:** ${now.toLocaleTimeString('es-ES')}\n- **Zona horaria:** ${Intl.DateTimeFormat().resolvedOptions().timeZone}`
    }

    // System info
    if (/(sistema|sistema\s*operativo|os|system|version|plataforma|platform)/i.test(input)) {
      const info = this.getSystemInfo()
      return `**Información del Sistema:**\n\n- **OS:** ${info.platform} ${info.arch}\n- **Node.js:** ${info.nodeVersion}\n- **Electron:** ${info.electronVersion}\n- **CPUs:** ${info.cpus} cores\n- **RAM Total:** ${Math.round(info.totalMemory / 1024 / 1024 / 1024 * 10) / 10} GB\n- **RAM Libre:** ${Math.round(info.freeMemory / 1024 / 1024 / 1024 * 10) / 10} GB\n- **Uptime:** ${Math.floor(info.uptime / 60)} minutos`
    }

    return null
  }

  private async handleProjectAnalysis(input: string, originalInput: string): Promise<{ content: string; data?: Record<string, unknown> } | null> {
    if (!/(analizar|analyze|proyecto|project|estructura|estructura|detectar|detect|contar|count|framework|lenguaje|language)/i.test(input)) {
      return null
    }

    try {
      const projectPath = this.extractPath(originalInput) || process.cwd()
      const analysis = this.analyzeProject(projectPath)

      let md = `## Análisis del Proyecto\n\n`
      md += `**Ruta:** \`${analysis.path}\`\n`
      md += `**Archivos:** ${analysis.totalFiles}\n`
      md += `**Líneas totales:** ${analysis.totalLines.toLocaleString()}\n\n`

      if (analysis.packageJson) {
        md += `### Package.json\n`
        md += `- **Nombre:** ${analysis.packageJson.name || 'N/A'}\n`
        md += `- **Versión:** ${analysis.packageJson.version || 'N/A'}\n\n`
        if (analysis.packageJson.dependencies) {
          md += `**Dependencias:** ${Object.keys(analysis.packageJson.dependencies).length}\n`
          md += Object.keys(analysis.packageJson.dependencies).map(d => `  - ${d}`).join('\n') + '\n\n'
        }
      }

      if (Object.keys(analysis.languages).length > 0) {
        md += `### Lenguajes detectados\n`
        const sorted = Object.entries(analysis.languages).sort(([, a], [, b]) => b - a)
        for (const [ext, count] of sorted) {
          md += `- **${ext}:** ${count} archivos\n`
        }
      }

      if (analysis.frameworks.length > 0) {
        md += `\n### Frameworks detectados\n`
        md += analysis.frameworks.map(f => `- ${f}`).join('\n') + '\n'
      }

      return { content: md, data: analysis as unknown as Record<string, unknown> }
    } catch {
      return null
    }
  }

  private isPathSafe(filePath: string): boolean {
    const resolved = path.resolve(filePath)
    const blocked = ['etc/passwd', 'etc/shadow', '.env', '.ssh', 'windows/system32']
    const lower = resolved.toLowerCase()
    if (blocked.some(b => lower.includes(b))) return false
    if (filePath.includes('..')) return false
    return true
  }

  private async handleFileOperation(_input: string, originalInput: string): Promise<string | null> {
    // Read file
    const readMatch = originalInput.match(/(?:lee|read|mostrar|show|ver|ver\s*contenido|abrir|open)\s+(?:el\s+)?(?:archivo\s+)?[`"']?([^\s`"']+)[`"']?/i)
    if (readMatch) {
      const filePath = readMatch[1]
      if (!this.isPathSafe(filePath)) {
        return `Acceso denegado a \`${filePath}\`. No se permiten rutas con ".." ni archivos sensibles del sistema.`
      }
      try {
        const fullPath = path.resolve(filePath)
        const content = fs.readFileSync(fullPath, 'utf-8')
        const ext = path.extname(filePath)
        const lang = this.extToLanguage(ext)
        return `**Contenido de \`${filePath}\`:**\n\n\`\`\`${lang}\n${content}\n\`\`\``
      } catch {
        return `No pude leer el archivo \`${filePath}\`. Verifica que la ruta sea correcta.`
      }
    }

    // List directory
    const listMatch = originalInput.match(/(?:lista|list|mostrar|show|ver)\s+(?:el\s+)?(?:directorio|directory|folder|carpeta)\s+[`"']?([^\s`"']+)[`"']?/i)
    if (listMatch) {
      const dirPath = listMatch[1]
      if (!this.isPathSafe(dirPath)) {
        return `Acceso denegado a \`${dirPath}\`. No se permiten rutas con ".." ni directorios sensibles del sistema.`
      }
      try {
        const fullPath = path.resolve(dirPath)
        const entries = fs.readdirSync(fullPath, { withFileTypes: true })
        let md = `**Contenido de \`${dirPath}\`:**\n\n`
        for (const entry of entries) {
          const icon = entry.isDirectory() ? '📁' : '📄'
          md += `${icon} ${entry.name}\n`
        }
        return md
      } catch {
        return `No pude acceder al directorio \`${dirPath}\`.`
      }
    }

    return null
  }

  getSystemInfo(): SystemInfo {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      electronVersion: process.versions.electron || 'N/A',
      uptime: os.uptime(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
    }
  }

  analyzeProject(projectPath: string): ProjectAnalysis {
    const analysis: ProjectAnalysis = {
      path: projectPath,
      totalFiles: 0,
      totalLines: 0,
      languages: {},
      frameworks: [],
      structure: '',
    }

    // Read package.json if exists
    try {
      const pkgPath = path.join(projectPath, 'package.json')
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      analysis.packageJson = {
        name: pkg.name,
        version: pkg.version,
        dependencies: pkg.dependencies,
        devDependencies: pkg.devDependencies,
      }

      // Detect frameworks
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
      const frameworkMap: Record<string, string> = {
        react: 'React', vue: 'Vue', angular: 'Angular', svelte: 'Svelte',
        next: 'Next.js', nuxt: 'Nuxt', gatsby: 'Gatsby',
        express: 'Express', fastify: 'Fastify', koa: 'Koa', nest: 'NestJS',
        electron: 'Electron', vite: 'Vite', webpack: 'Webpack',
        tailwindcss: 'Tailwind CSS', 'styled-components': 'Styled Components',
        typescript: 'TypeScript', prisma: 'Prisma', drizzle: 'Drizzle ORM',
      }
      for (const [dep, name] of Object.entries(frameworkMap)) {
        if (allDeps[dep]) analysis.frameworks.push(name)
      }
    } catch { /* no package.json */ }

    // Walk directory
    const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '__pycache__'])
    const walk = (dir: string, depth = 0) => {
      if (depth > 5) return
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)

          if (entry.isDirectory()) {
            if (!skipDirs.has(entry.name)) {
              analysis.structure += `${'  '.repeat(depth)}📁 ${entry.name}/\n`
              walk(fullPath, depth + 1)
            }
          } else {
            analysis.totalFiles++
            analysis.structure += `${'  '.repeat(depth)}📄 ${entry.name}\n`

            const ext = path.extname(entry.name).toLowerCase()
            if (ext) {
              analysis.languages[ext] = (analysis.languages[ext] || 0) + 1
            }

            // Count lines for text files
            const textExts = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java', '.c', '.cpp', '.h', '.css', '.html', '.json', '.md', '.yaml', '.yml', '.toml', '.xml', '.sql', '.sh', '.bat', '.ps1', '.vue', '.svelte'])
            if (textExts.has(ext)) {
              try {
                const content = fs.readFileSync(fullPath, 'utf-8')
                analysis.totalLines += content.split('\n').length
              } catch { /* binary or unreadable */ }
            }
          }
        }
      } catch { /* permission denied */ }
    }

    walk(projectPath)
    return analysis
  }

  private extractPath(input: string): string | null {
    const match = input.match(/(?:de\s+|del\s+|en\s+|from\s+|at\s+|in\s+)[`"']?([a-zA-Z]:[\\\/][^\s`"']+|\/[^\s`"']+|\.[\\\/][^\s`"']+)[`"']?/i)
    return match ? match[1] : null
  }

  private extToLanguage(ext: string): string {
    const map: Record<string, string> = {
      '.ts': 'typescript', '.tsx': 'tsx', '.js': 'javascript', '.jsx': 'jsx',
      '.py': 'python', '.rs': 'rust', '.go': 'go', '.java': 'java',
      '.css': 'css', '.html': 'html', '.json': 'json', '.md': 'markdown',
      '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml', '.sql': 'sql',
      '.sh': 'bash', '.vue': 'vue', '.svelte': 'svelte',
    }
    return map[ext] || ''
  }
}
