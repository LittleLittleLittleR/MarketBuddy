import { useState, type Dispatch, type SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { StocklistDisplay } from '@/types/stock';
import { watchlistStockHooks } from '@/hooks/watchlist_stock';
import { useMutation, useQueryClient } from '@tanstack/react-query'

type WatchlistHeaderProps = {
  watchlist: StocklistDisplay[];
  isAdding: boolean
  setIsAdding: Dispatch<SetStateAction<boolean>>
}

export function WatchlistHeader({ watchlist, isAdding, setIsAdding }: WatchlistHeaderProps) {
  const [newTicker, setNewTicker] = useState('')
  const queryClient = useQueryClient();
  const isLimitReached = watchlist.length >= 3

  const addStockMutation = useMutation({
    mutationFn: async (ticker: string) => {
      await watchlistStockHooks.addStock(ticker)
    },
    onMutate: () => {
      setIsAdding(true)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlistPrices'] }) // invalidate querykey for repoll
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
    if (watchlist.length >= 3) {
      console.warn("Watchlist threshold met. Max 3 entries allowed.")
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
        <h2 className="text-3xl font-bold tracking-tight">Your Watchlist</h2>
        <p className="text-muted-foreground">Track your favourite stocks in one place</p>
      </div>
      <Separator className="my-6" />

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder={isLimitReached ? "Watchlist Full!" : "Enter Ticker (e.g AAPL)"}
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
