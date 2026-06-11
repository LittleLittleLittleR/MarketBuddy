import type { SummaryPayload } from '@/hooks/summary'

export type ShareableSummary = Pick<SummaryPayload, 'ticker' | 'summary'>

export const summariesToText = (summaries: ShareableSummary[]) => {
  return summaries
    .map((summary, index) => `${index + 1}. ${summary.ticker}\n${summary.summary}`)
    .join('\n\n')
}

export const decodeSharedSummariesPayload = (payload: string | null) => {
  if (!payload) {
    return [] as ShareableSummary[]
  }

  try {
    const decoded = JSON.parse(decodeURIComponent(payload))

    if (!Array.isArray(decoded)) {
      return [] as ShareableSummary[]
    }

    return decoded
      .filter((item) => item && typeof item.ticker === 'string' && typeof item.summary === 'string')
      .map((item) => ({
        ticker: item.ticker,
        summary: item.summary,
      })) as ShareableSummary[]
  } catch {
    return [] as ShareableSummary[]
  }
}