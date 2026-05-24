# NEXUS - Asistente IA Personal

Asistente de inteligencia artificial personal para escritorio, construido con Electron + React. Inspirado en Jarvis (Iron Man), ChatGPT, Cursor IDE, Raycast y Linear.

## Características

- **IA Híbrida**: OpenAI (cloud) y Ollama (local) con routing inteligente por capas
- **Cerebro Local**: Procesamiento de patrones y respuestas sin necesidad de IA externa
- **Búsqueda Web**: DuckDuckGo y Wikipedia integrados
- **Memoria Contextual**: Sistema de memoria persistente con grafo de conocimiento
- **Diseño Profesional**: Dark mode, glassmorphism, animaciones fluidas con Framer Motion
- **Seguridad**: Context isolation, API keys solo en el proceso principal

## Tecnologías

- **Frontend**: React 18, TypeScript 5, Tailwind CSS 3, Framer Motion
- **Backend**: Electron 28, Node.js
- **IA**: OpenAI API, Ollama
- **Estado**: Zustand con persistencia localStorage
- **UI**: Radix UI, Lucide Icons
- **Build**: Vite 5, tsup (main process), electron-builder

## Instalación

```bash
git clone https://github.com/joaocisneros/nexus-ia.git
cd nexus-ia
npm install
cp .env.example .env
# Editar .env con tu API key de OpenAI (opcional, Ollama funciona sin ella)
npm run dev
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Modo desarrollo (main + renderer + electron) |
| `npm run build` | Build de producción completo |
| `npm run build:main` | Compilar proceso principal |
| `npm run build:react` | Compilar frontend |
| `npm run type-check` | Verificar tipos TypeScript |
| `npm run lint` | Ejecutar ESLint |

## Variables de Entorno

```env
OPENAI_API_KEY=sk-...           # Opcional - API key de OpenAI
OPENAI_MODEL=gpt-4              # Modelo de OpenAI a usar
OLLAMA_HOST=http://localhost:11434  # Servidor Ollama local
```

## Arquitectura

```
Renderer (React)          Preload (contextBridge)       Main Process (Electron)
─────────────────         ─────────────────────         ──────────────────────
UI Components      →      window.electron.*       →     IPC Handlers
CoreIntelligence   →      ai / brain / web        →     QueryRouter → LocalBrain
Zustand Store             (secure bridge)                → WebSearch → AI
```

El sistema usa un routing por capas: cerebro local → búsqueda web → IA, con fallback automático.

## Estructura

```
src/
├── main.ts              # Proceso principal Electron
├── preload.ts           # Bridge seguro main/renderer
├── main.tsx             # Entry point React
├── App.tsx              # Componente raíz
├── components/          # Componentes UI (chat, botones, error boundary)
├── layouts/             # Layouts (Sidebar, Chat, Panel derecho)
├── services/
│   ├── ai/              # Servicios de IA (OpenAI, Ollama)
│   ├── brain/           # Router de consultas, cerebro local
│   ├── core/            # Inteligencia central, memoria, conocimiento
│   └── web/             # Búsqueda web (DuckDuckGo, Wikipedia)
├── store/               # Estado global (Zustand)
├── hooks/               # Custom hooks
├── types/               # Definiciones TypeScript
└── utils/               # Utilidades
```

## Licencia

MIT
