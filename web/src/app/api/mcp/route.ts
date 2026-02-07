import { NextRequest, NextResponse } from 'next/server'
import { SEARCH_WEB_TOOL, listTools } from '@/lib/mcp/tools'
import { searchWeb, formatSearchContext } from '@/lib/search/tavily'

type JsonRpcRequest = {
  jsonrpc: '2.0'
  id?: string | number
  method: string
  params?: Record<string, unknown>
}

function jsonRpcError(id: string | number | undefined, code: number, message: string) {
  return NextResponse.json({
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message },
  })
}

function jsonRpcResult(id: string | number | undefined, result: unknown) {
  return NextResponse.json({
    jsonrpc: '2.0',
    id: id ?? null,
    result,
  })
}

export async function POST(request: NextRequest) {
  let body: JsonRpcRequest
  try {
    body = (await request.json()) as JsonRpcRequest
  } catch {
    return jsonRpcError(undefined, -32700, 'Parse error')
  }

  const { jsonrpc, id, method, params } = body
  if (jsonrpc !== '2.0' || typeof method !== 'string') {
    return jsonRpcError(id, -32600, 'Invalid Request')
  }

  if (method === 'tools/list') {
    return jsonRpcResult(id, listTools())
  }

  if (method === 'tools/call') {
    const name = params?.name as string | undefined
    const args = (params?.arguments ?? params?.args) as Record<string, unknown> | undefined

    if (name !== SEARCH_WEB_TOOL.name) {
      return jsonRpcError(id, -32602, `Unknown tool: ${name ?? 'missing'}`)
    }

    const query = typeof args?.query === 'string' ? args.query.trim() : ''
    if (!query) {
      return jsonRpcResult(id, {
        content: [{ type: 'text', text: 'Error: missing or invalid "query" argument.' }],
        isError: true,
      })
    }

    const response = await searchWeb(query)
    if (!response?.results?.length) {
      return jsonRpcResult(id, {
        content: [
          {
            type: 'text',
            text: 'No search results found. (Ensure TAVILY_API_KEY is set on the server.)',
          },
        ],
        isError: false,
      })
    }

    const text = formatSearchContext(response)
    return jsonRpcResult(id, {
      content: [{ type: 'text', text }],
      isError: false,
    })
  }

  return jsonRpcError(id, -32601, `Method not found: ${method}`)
}
