import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { tradeHooks } from '@/hooks/trade'
import { useRealtimePrice } from '@/context/RealtimePriceContext'

import type { TradeRequest } from '@/types/trade'

type AddTradePopupProps = {
  isOpen: boolean
  onClose: () => void
  portfolioId: number
}

export function AddTradePopup({ isOpen, onClose, portfolioId }: AddTradePopupProps) {
  const [inputStock, setInputStock] = useState('')
  const [inputQuantity, setInputQuantity] = useState<number | ''>('')
  const [inputPrice, setInputPrice] = useState<number | ''>('')
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0])
  const [inputSide, setInputSide] = useState('buy')

  const queryClient = useQueryClient()
  const { subscribeToTicker } = useRealtimePrice()

  const addTradeMutation = useMutation({
    mutationFn: async (payload: TradeRequest) => {
      await tradeHooks.addTrade(payload)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['portfolioPrices'] })
      // Subscribe to real-time prices for the new ticker immediately.
      // Only on buy — a sell doesn't open a new position.
      if (variables.side === 'buy') {
        subscribeToTicker(variables.ticker)
      }
    },
    onError: (error) => {
      console.error('Failed to add logs:', error)
    }
  })

  const handleCreateTrade = async () => {
    if (!inputStock.trim()) return

    const tradePayload: TradeRequest = {
      portfolio_id: portfolioId,
      ticker: inputStock.trim(),
      quantity: typeof inputQuantity === 'number' ? inputQuantity : 0,
      entry_cost: typeof inputPrice === 'number' ? inputPrice : 0,
      fees: null,
      notes: null,
      trade_date: inputDate,
      side: inputSide as 'buy' | 'sell'
    }

    await addTradeMutation.mutateAsync(tradePayload)

    setInputStock('')
    setInputQuantity('')
    setInputPrice('')
    setInputDate(new Date().toISOString().split('T')[0])
    setInputSide('buy')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleCreateTrade()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">

      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative z-10 w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
        <h2 className="text-lg font-medium mb-4">Add New Trade</h2>
        <form onSubmit={handleSubmit}>
          <Input
            type="text"
            placeholder="Stock Ticker"
            className="w-full border p-2 mb-4"
            value={inputStock}
            onChange={(e) => setInputStock(e.target.value.toUpperCase())}
          />
          <Input
            type="number"
            placeholder="Quantity"
            className="w-full border p-2 mb-4 no-spinner"
            value={inputQuantity}
            onChange={(e) => setInputQuantity(e.target.value === '' ? '' : Number(e.target.value))}
          />     
          <Input
            type="number"
            placeholder="Price"
            className="w-full border p-2 mb-4 no-spinner"
            value={inputPrice}
            onChange={(e) => setInputPrice(e.target.value === '' ? '' : Number(e.target.value))}
          />
          <Input
            type="date"
            className="w-full border p-2 mb-4"
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
          />
          <Select
            value={inputSide}
            onValueChange={setInputSide}
          >
            <SelectTrigger className="w-full border p-2 mb-4">
              <SelectValue placeholder="Select side" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            className="w-full"
            type="submit" 
            disabled={addTradeMutation.isPending}
          >
            {addTradeMutation.isPending ? 'Creating...' : 'Create Trade'}
          </Button>
        </form>
      </div>
    </div>
  )
}
