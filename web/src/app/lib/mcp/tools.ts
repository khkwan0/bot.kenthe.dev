/**
 * Single source of truth for MCP tools (used by API route and AI system prompt).
 */

export const SEARCH_WEB_TOOL = {
  name: 'search_web',
  description:
    'Search the web for up-to-date information. Use when the user asks about current events, recent facts, or when you need to verify or look up information.  If you need to call a tool reposnd ionly in JSON format with a "tool" field',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string' as const,
        description:
          'Search query (e.g. "latest news about X", "weather in Tokyo")',
      },
    },
    required: ['query'] as const,
  },
} as const

const TOOLS_LIST = [SEARCH_WEB_TOOL]

/** MCP tools/list result. */
export function listTools() {
  return { tools: TOOLS_LIST }
}

/** Ollama chat API tools array (function-calling format). */
export function ollamaTools(): import('ollama').Tool[] {
  return TOOLS_LIST.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object',
        required: [...t.inputSchema.required],
        properties: {
          query: {
            type: 'string' as const,
            description: t.inputSchema.properties.query.description,
          },
        },
      },
    },
  })) as import('ollama').Tool[]
}

/** Build system prompt describing available tools for Ollama. */
export function toolsSystemPrompt(): string {
  const lines = [
    'Tools:',
  ]
  for (const t of TOOLS_LIST) {
    const params =
      t.inputSchema.properties?.query?.description ?? 'query (string)'
    lines.push(`- ${t.name}: ${t.description} Input: ${params}.`)
  }
  return lines.join('\n')
}
