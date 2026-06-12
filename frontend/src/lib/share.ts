import type { SummaryPayload } from '@/hooks/summary'

export const stripMarkdown = (value: string | undefined | null) => {
  if (!value) return ''
  return value.replace(/\*\*(.*?)\*\*/g, '$1')
}

export const formatSummaryHtmlList = (summary: string) => {
  // split summaries into lines and wrap them in p tags
  // indent paragraphs and remove markdown bold syntax  
  // help me to style the list items with tailwindcss classes, and make the first line a header with the ticker name
  
  const lines = summary.split('\n').filter(line => line.trim() !== '')
  const formattedLines = lines.map((line, index) => {
    const trimmedLine = line.trim()
    const withoutMarkdown = stripMarkdown(trimmedLine)
    if (index === 0) {
      return `<h3 class="text-lg font-bold">${withoutMarkdown}</h3><br>`
    }
    return `<p>${withoutMarkdown}</p>`
  })
  return  formattedLines.join('\n')
}

export const decodeSharedSummariesPayload = (payload: string | null) => {
  if (!payload) {
    return [] as SummaryPayload[]
  }

  try {
    const decoded = JSON.parse(decodeURIComponent(payload))

    if (!Array.isArray(decoded)) {
      return [] as SummaryPayload[]
    }

    return decoded
      .filter((item) => item && typeof item.ticker === 'string' && typeof item.summary === 'string')
      .map((item) => ({
        ticker: item.ticker,
        summary: item.summary,
      })) as SummaryPayload[]
  } catch {
    return [] as SummaryPayload[]
  }
}