import { fetchTickerPrices } from '@/api/ticker'
import { fetchProfile } from '@/api/candles'
import { stockService } from '@/db/stock'
import type { StockResponse } from '@/types/stock'

// scraper runs in the background on first request and a new ticker first comes back PENDING. 
// poll few times before giving up and inserting a placeholder
const PENDING_POLL_INTERVAL_MS = 1500
const PENDING_MAX_POLLS = 4

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// ensures rawTicker exists in Supabase before referencing
const resolveStock = async (rawTicker: string): Promise<StockResponse> => {
  const ticker = rawTicker.trim().toUpperCase()
  if (!ticker) {
    throw new Error('Ticker is required')
  }

  let live = (await fetchTickerPrices([ticker]))[ticker]

  for (
    let attempt = 0;
    live?.status === 'PENDING' && attempt < PENDING_MAX_POLLS;
    attempt++
  ) {
    await sleep(PENDING_POLL_INTERVAL_MS)
    live = (await fetchTickerPrices([ticker]))[ticker]
  }

  if (!live || live.status === 'INVALID') {
    throw new Error(`"${ticker}" isn't a recognised ticker`)
  }
  if (live.status === 'FAILED') {
    throw new Error(`Couldn't fetch a price for "${ticker}" right now. Please try again.`)
  }

  const profile = await fetchProfile(ticker).catch(() => null)

  return stockService.upsertStock({
    ticker,
    company_name: profile?.company_name ?? ticker,
    currency: profile?.currency ?? null,
    current_price: live.price ?? null,
    open_price: live.open ?? live.opening_price ?? null,
    updated_at: live.updated_at
      ? new Date(live.updated_at * 1000).toISOString()
      : new Date().toISOString(),
  })
}

// used by the search bar
const searchStock = async (rawTicker: string): Promise<StockResponse> => {
  const ticker = rawTicker.trim().toUpperCase()
  if (!ticker) {
    throw new Error('Ticker is required')
  }

  try {
    return await stockService.getStockByID(ticker)
  } catch {
    // not in Supabase yet, ask the backend to validate it
    return resolveStock(ticker)
  }
}

export const stockHooks = {
  resolveStock,
  searchStock,
}
