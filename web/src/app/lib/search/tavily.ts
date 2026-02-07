/**
 * Tavily Search API – web search for RAG (Perplexity-style).
 * Set TAVILY_API_KEY to enable. Get a key at https://app.tavily.com
 */

export type TavilyResult = {
  title: string
  url: string
  content: string
  score?: number
}

export type TavilySearchResponse = {
  query: string
  results: TavilyResult[]
  response_time?: number
}

const TAVILY_API_KEY = process.env.TAVILY_API_KEY
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search'

export function isWebSearchEnabled(): boolean {
  return Boolean(TAVILY_API_KEY?.trim())
}

export async function searchWeb(query: string): Promise<TavilySearchResponse | null> {
  if (!TAVILY_API_KEY?.trim()) {
    return null
  }
  try {
    const res = await fetch(TAVILY_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TAVILY_API_KEY.trim()}`,
      },
      body: JSON.stringify({
        query,
        max_results: 8,
        search_depth: 'basic',
        include_answer: false,
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('Tavily search error:', res.status, text)
      return null
    }
    const data = (await res.json()) as TavilySearchResponse
    return data
  } catch (err) {
    console.error('Tavily search request failed:', err)
    return null
  }
}

/**
 * Format search results as context text for the LLM (RAG).
 * Citations use [1], [2], … so the model can reference sources.
 */
export function formatSearchContext(response: TavilySearchResponse): string {
  const lines: string[] = [
    'Use the following web search results to answer the user. Cite sources with [1], [2], etc. and list sources at the end.',
    '',
  ]
  response.results.forEach((r, i) => {
    const num = i + 1
    lines.push(`[${num}] ${r.title}`)
    lines.push(r.url)
    lines.push(r.content || '')
    lines.push('')
  })
  return lines.join('\n')
}
