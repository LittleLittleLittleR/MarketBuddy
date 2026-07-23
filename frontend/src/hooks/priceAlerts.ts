import { priceAlertService } from '@/db/price_alerts'
import type { AlertCondition, PriceAlertResponse } from '@/types/stock'

export const CONDITION_LABELS: Record<AlertCondition, string> = {
  price_above: 'Price rises above',
  price_below: 'Price falls below',
  percent_change_up: 'Gains more than',
  percent_change_down: 'Drops more than',
}

const fetchAlerts = async (): Promise<PriceAlertResponse[]> => {
  const data = await priceAlertService.getMyPriceAlerts()
  return (data ?? []) as PriceAlertResponse[]
}

const fetchAlertsForTicker = async (ticker: string): Promise<PriceAlertResponse[]> => {
  if (!ticker?.trim()) return []
  const data = await priceAlertService.getActiveAlertsForTicker(ticker)
  return (data ?? []) as PriceAlertResponse[]
}

const createAlert = async (
  ticker: string,
  condition: AlertCondition,
  threshold: number
): Promise<PriceAlertResponse> => {
  if (!ticker?.trim()) {
    throw new Error('A ticker is required to set an alert.')
  }
  if (!Number.isFinite(threshold) || threshold <= 0) {
    throw new Error('Threshold must be a positive number.')
  }
  if (condition === 'percent_change_up' || condition === 'percent_change_down') {
    if (threshold > 100) {
      throw new Error('Percentage change must be 100 or less.')
    }
  }

  const data = await priceAlertService.createPriceAlert({
    stock_ticker: ticker.toUpperCase(),
    condition,
    threshold,
  })
  return data as PriceAlertResponse
}

const deleteAlert = async (alertId: number) => {
  await priceAlertService.deletePriceAlert(alertId)
}

// Called once an alert's condition has fired, so it doesn't keep re-notifying
// every time a new price tick still satisfies the same threshold.
const markTriggered = async (alertId: number) => {
  await priceAlertService.updatePriceAlert(alertId, {
    is_active: false,
    triggered_at: new Date().toISOString(),
  })
}

// Shared evaluation logic used by the realtime monitor. `changePercent` should
// be the day's percentage change (current vs. open), same as shown in the
// watchlist table.
const isAlertTriggered = (
  alert: PriceAlertResponse,
  currentPrice: number | null,
  changePercent: number | null
): boolean => {
  if (currentPrice == null) return false

  switch (alert.condition) {
    case 'price_above':
      return currentPrice >= alert.threshold
    case 'price_below':
      return currentPrice <= alert.threshold
    case 'percent_change_up':
      return changePercent != null && changePercent >= alert.threshold
    case 'percent_change_down':
      return changePercent != null && changePercent <= -alert.threshold
    default:
      return false
  }
}

const describeAlert = (alert: PriceAlertResponse): string => {
  const isPercent = alert.condition === 'percent_change_up' || alert.condition === 'percent_change_down'
  const value = isPercent ? `${alert.threshold}%` : `$${alert.threshold.toFixed(2)}`
  return `${CONDITION_LABELS[alert.condition]} ${value}`
}

export const priceAlertHooks = {
  fetchAlerts,
  fetchAlertsForTicker,
  createAlert,
  deleteAlert,
  markTriggered,
  isAlertTriggered,
  describeAlert,
}
