import type { GitlawbMCPTool } from '@/types/gitlawb'

export function getNEXUSTools(): GitlawbMCPTool[] {
  return [
    {
      name: 'nexus_osint_dni',
      description: 'Consulta datos de una persona por DNI peruano (8 dígitos). Tier 1 - gratis.',
      inputSchema: {
        type: 'object',
        properties: { dni: { type: 'string', description: 'DNI de 8 dígitos' } },
        required: ['dni'],
      },
    },
    {
      name: 'nexus_osint_ruc',
      description: 'Consulta datos de una empresa por RUC peruano (11 dígitos). Tier 1 - gratis.',
      inputSchema: {
        type: 'object',
        properties: { ruc: { type: 'string', description: 'RUC de 11 dígitos' } },
        required: ['ruc'],
      },
    },
    {
      name: 'nexus_osint_dni_full',
      description: 'Consulta datos completos de una persona por DNI. Tier 2 - requiere créditos.',
      inputSchema: {
        type: 'object',
        properties: { dni: { type: 'string', description: 'DNI de 8 dígitos' } },
        required: ['dni'],
      },
    },
    {
      name: 'nexus_osint_family',
      description: 'Consulta grafo familiar por DNI. Tier 2 - requiere créditos.',
      inputSchema: {
        type: 'object',
        properties: { dni: { type: 'string', description: 'DNI de 8 dígitos' } },
        required: ['dni'],
      },
    },
    {
      name: 'nexus_osint_plate',
      description: 'Consulta datos de vehículo por placa. Tier 2 - requiere créditos.',
      inputSchema: {
        type: 'object',
        properties: { placa: { type: 'string', description: 'Placa vehicular' } },
        required: ['placa'],
      },
    },
    {
      name: 'nexus_memory_search',
      description: 'Busca en la memoria persistente de NEXUS.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Término de búsqueda' },
          limit: { type: 'number', description: 'Máximo de resultados' },
        },
        required: ['query'],
      },
    },
    {
      name: 'nexus_memory_save',
      description: 'Guarda un nuevo recuerdo en la memoria de NEXUS.',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Contenido del recuerdo' },
          type: { type: 'string', enum: ['learning', 'context', 'preference', 'conversation'] },
          importance: { type: 'number', minimum: 1, maximum: 10 },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['content', 'type', 'importance'],
      },
    },
    {
      name: 'nexus_brain_process',
      description: 'Procesa una consulta usando el cerebro de NEXUS (routing automático).',
      inputSchema: {
        type: 'object',
        properties: { input: { type: 'string', description: 'Consulta del usuario' } },
        required: ['input'],
      },
    },
    {
      name: 'nexus_workflow_execute',
      description: 'Ejecuta un workflow predefinido de NEXUS.',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: { type: 'string', description: 'ID del workflow' },
          input: { type: 'string', description: 'Input opcional' },
        },
        required: ['workflowId'],
      },
    },
    {
      name: 'nexus_goal_start',
      description: 'Inicia un goal autónomo en NEXUS.',
      inputSchema: {
        type: 'object',
        properties: { objective: { type: 'string', description: 'Objetivo del goal' } },
        required: ['objective'],
      },
    },
  ]
}
