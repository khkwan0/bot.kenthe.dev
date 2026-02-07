This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Web Search (RAG, Perplexity-style)

To get up-to-date answers with web search and citations:

1. Get a free API key at [Tavily](https://app.tavily.com).
2. Set `TAVILY_API_KEY` in your environment (e.g. in `.env` or `.env.local`).

When `TAVILY_API_KEY` is set, every user question triggers a web search; the top results are injected as context into the LLM (Ollama). The model is instructed to cite sources as [1], [2], … and list them at the end. No code changes are needed—just set the env var.

Optional: `OLLAMA_HOST` – Ollama server URL (default: `http://vr.local.net:11434`).

### Tavily MCP in Cursor

To use Tavily from Cursor (e.g. so the AI can search the web while you code), add Tavily’s remote MCP server:

1. **Cursor Settings → MCP** (or create `.cursor/mcp.json` in the project root).
2. Add a server with URL:  
   `https://mcp.tavily.com/mcp/?tavilyApiKey=YOUR_TAVILY_API_KEY`  
   Replace `YOUR_TAVILY_API_KEY` with your key (the same value as `TAVILY_API_KEY` in `.env`). Do not commit the key.
3. Restart Cursor if needed.

Example `.cursor/mcp.json` (keep this file out of version control if it contains your key, or use a placeholder and fill it locally):

```json
{
  "mcpServers": {
    "tavily": {
      "url": "https://mcp.tavily.com/mcp/?tavilyApiKey=YOUR_TAVILY_API_KEY"
    }
  }
}
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
