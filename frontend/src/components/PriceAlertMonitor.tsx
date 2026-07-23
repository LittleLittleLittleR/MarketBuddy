import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useAuth } from '@/context/AuthContext'
import { useRealtimePrice } from '@/context/RealtimePriceContext'
import { priceAlertHooks } from '@/hooks/priceAlerts'
import type { PriceAlertResponse } from '@/types/stock'

// Mounted once near the root of the app. Has no UI of its own — it just
// watches the live price feed against the user's active alerts and fires a
// toast (and deactivates the alert) the moment a threshold is crossed.
export function PriceAlertMonitor() {
  const { session } = useAuth()
  const isAuthed = !!session?.access_token
  const { latestPrices } = useRealtimePrice()
  const queryClient = useQueryClient()

  // Tracks alert ids we've already fired in this session so a single price
  // tick doesn't spam multiple toasts while the "mark triggered" write is
  // still in flight.
  const firingRef = useRef<Set<number>>(new Set())

  const { data: alerts = [] } = useQuery<PriceAlertResponse[]>({
    queryKey: ['priceAlerts'],
    queryFn: priceAlertHooks.fetchAlerts,
    enabled: isAuthed,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (!isAuthed || alerts.length === 0) return

    for (const alert of alerts) {
      if (!alert.is_active || firingRef.current.has(alert.id)) continue

      const live = latestPrices[alert.stock_ticker.toUpperCase()]
      if (!live) continue

      const changePercent =
        live.open != null && live.open !== 0
          ? ((live.price - live.open) / live.open) * 100
          : null

      if (!priceAlertHooks.isAlertTriggered(alert, live.price, changePercent)) continue

      firingRef.current.add(alert.id)

      toast.success(`Price Alert: ${alert.stock_ticker}`, {
        description: `${alert.stock_ticker} is now at $${live.price.toFixed(2)} — ${priceAlertHooks.describeAlert(alert).toLowerCase()}.`,
        duration: 8000,
      })

      priceAlertHooks
        .markTriggered(alert.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['priceAlerts'] })
        })
        .catch((err) => {
          console.error('Failed to mark alert as triggered:', err)
          // allow retry on the next tick if the write failed
          firingRef.current.delete(alert.id)
        })
    }
  }, [alerts, latestPrices, isAuthed, queryClient])

  return null
}
