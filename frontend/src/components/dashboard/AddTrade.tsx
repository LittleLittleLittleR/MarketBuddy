import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { tradeHooks } from '@/hooks/trade'

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
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]) // default today
  const [inputSide, setInputSide] = useState('buy')
  
  const queryClient = useQueryClient()

  const addTradeMutation = useMutation({
    mutationFn: async (payload: TradeRequest) => {
      await tradeHooks.addTrade(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolioPrices'] }) // invalidate querykey for repoll
    },
    onError: (error) => {
      console.error('Failed to add logs:', error)
    }
  })

  const handleCreateTrade = async () => {
    if (inputStock.trim()) {
      const trimmedStock = inputStock.trim()
      const tradePayload: TradeRequest = {
        portfolio_id: portfolioId,
        ticker: trimmedStock,
        quantity: typeof inputQuantity === 'number' ? inputQuantity : 0,
        entry_cost: typeof inputPrice === 'number' ? inputPrice : 0,
        fees: null,
        notes: null,
        trade_date: inputDate,
        side: inputSide as 'buy' | 'sell'
      }
      addTradeMutation.mutate(tradePayload)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['portfolioNames'] }),
        queryClient.invalidateQueries({ queryKey: ['portfolioPrices'] }),
      ])

      setInputStock('')
      setInputQuantity('')
      setInputPrice('')
      setInputDate(new Date().toISOString().split('T')[0])
      setInputSide('buy')
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO
    console.log("Add complete")
  }

  if (!isOpen) return null;

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
            onChange={(e) => setInputStock(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Quantity"
            className="w-full border p-2 mb-4"
            value={inputQuantity}
            onChange={(e) => setInputQuantity(Number(e.target.value))}
          />
          <Input
            type="number"
            placeholder="Price"
            className="w-full border p-2 mb-4"
            value={inputPrice}
            onChange={(e) => setInputPrice(Number(e.target.value))}
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
            onClick={handleCreateTrade}
          >
            Create Trade
          </Button>
        </form>
      </div>
    </div>
  )
}