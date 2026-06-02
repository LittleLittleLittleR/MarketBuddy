import { useState, type Dispatch, type SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { StocklistDisplay } from '@/types/stock';
import { stocklistHooks } from '@/hooks/stocklist';
import { useMutation, useQueryClient } from '@tanstack/react-query'

type StocklistHeaderProps = {
  stocklist: StocklistDisplay[];
  isAdding: boolean
  setIsAdding: Dispatch<SetStateAction<boolean>>
  stockType: 'watchlist' | 'portfolio' | 'summarylist';
}

export function StocklistHeader({ stocklist, isAdding, setIsAdding, stockType }: StocklistHeaderProps) {
  const [newTicker, setNewTicker] = useState('')
  const queryClient = useQueryClient();
  const isLimitReached = stocklist.length >= 3 && stockType === 'summarylist' // only apply limit to summarylist

  const addStockMutation = useMutation({
    mutationFn: async (ticker: string) => {
      await stocklistHooks.addStock({ 
        stockType,
        newTicker: ticker 
      })
    },
    onMutate: () => {
      setIsAdding(true)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${stockType}Prices`] }) // invalidate querykey for repoll
    },
    onError: (error) => {
      console.error('Failed to add stock entry:', error)
    },
    onSettled: () => {
      setIsAdding(false)
    }
  })

  const handleAddStock = async (ticker: string) => {
    const cleanTicker = ticker.toUpperCase()
    if (isLimitReached) {
      console.warn("Summary list threshold met. Max 3 entries allowed.")
      return
    }
    addStockMutation.mutate(cleanTicker)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTicker.trim()) return
    await handleAddStock(newTicker)
    setNewTicker('')
    console.log("Add complete")
  }

  return (
    <div className="mb-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Your {stockType === 'watchlist' ? 'Watchlist' : stockType === 'portfolio' ? 'Portfolio' : 'Summary List'}</h2>
        <p className="text-muted-foreground">Track your favourite stocks in one place</p>
      </div>
      <Separator className="my-6" />

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder={isLimitReached ? `${stockType === 'summarylist' ? 'Summary List' : 'Watchlist'} Full!` : `Enter Ticker (e.g AAPL)`}
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
          className={`border rounded-md px-3 py-2 w-64 bg-background text-foreground ${isLimitReached ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          disabled={isAdding || isLimitReached}
        />
        <Button type="submit" disabled={isAdding || isLimitReached || !newTicker.trim()}>
          {isAdding ? 'Adding...' : isLimitReached ? 'Limit Reached (3)' : 'Add Stock'}
        </Button>
      </form>
    </div>
  )
}
