import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

import { priceAlertHooks, CONDITION_LABELS } from '@/hooks/priceAlerts'
import type { AlertCondition, PriceAlertResponse } from '@/types/stock'

type SetPriceAlertPopupProps = {
  isOpen: boolean
  onClose: () => void
  ticker: string
}

const CONDITIONS: AlertCondition[] = [
  'price_above',
  'price_below',
  'percent_change_up',
  'percent_change_down',
]

const isPercentCondition = (condition: AlertCondition) =>
  condition === 'percent_change_up' || condition === 'percent_change_down'

export function SetPriceAlertPopup({ isOpen, onClose, ticker }: SetPriceAlertPopupProps) {
  const [condition, setCondition] = useState<AlertCondition>('price_above')
  const [threshold, setThreshold] = useState<number | ''>('')

  const queryClient = useQueryClient()

  const { data: existingAlerts = [] } = useQuery<PriceAlertResponse[]>({
    queryKey: ['priceAlerts', 'ticker', ticker],
    queryFn: () => priceAlertHooks.fetchAlertsForTicker(ticker),
    enabled: isOpen && !!ticker,
  })

  const invalidateAlertQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['priceAlerts'] })
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      return priceAlertHooks.createAlert(ticker, condition, typeof threshold === 'number' ? threshold : NaN)
    },
    onSuccess: () => {
      toast.success('Alert created', {
        description: `We'll notify you when ${ticker} ${CONDITION_LABELS[condition].toLowerCase()} ${isPercentCondition(condition) ? `${threshold}%` : `$${threshold}`}.`,
      })
      invalidateAlertQueries()
      setThreshold('')
    },
    onError: (error: unknown) => {
      toast.error('Could not create alert', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (alertId: number) => {
      await priceAlertHooks.deleteAlert(alertId)
    },
    onSuccess: () => {
      invalidateAlertQueries()
    },
    onError: (error: unknown) => {
      toast.error('Could not remove alert', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (threshold === '') return
    await createMutation.mutateAsync()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border bg-background p-6 shadow-xl">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
          <Bell className="h-4 w-4" /> Set Price Alert for {ticker}
        </h2>

        {existingAlerts.length > 0 && (
          <div className="mb-4 space-y-2">
            {existingAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{priceAlertHooks.describeAlert(alert)}</span>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(alert.id)}
                  disabled={deleteMutation.isPending}
                  className="text-muted-foreground hover:text-red-500"
                  aria-label="Remove alert"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Select
            value={condition}
            onValueChange={(value) => setCondition(value as AlertCondition)}
          >
            <SelectTrigger className="mb-4 w-full border p-2">
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {CONDITION_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            step="0.01"
            placeholder={isPercentCondition(condition) ? 'Percent change (e.g. 5)' : 'Target price ($)'}
            className="mb-4 w-full border p-2 no-spinner"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value === '' ? '' : Number(e.target.value))}
          />

          <Button
            className="w-full"
            type="submit"
            disabled={createMutation.isPending || threshold === ''}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Alert'}
          </Button>
        </form>
      </div>
    </div>
  )
}
