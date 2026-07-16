import { useState, type Dispatch, type SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { watchlistHooks } from '@/hooks/watchlist';
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRealtimePrice } from '@/context/RealtimePriceContext'
import { toast } from 'sonner'

type WatchlistHeaderProps = {
  isAdding: boolean
  setIsAdding: Dispatch<SetStateAction<boolean>>
}

export function WatchlistHeader({ isAdding, setIsAdding }: WatchlistHeaderProps) {
  const [newTicker, setNewTicker] = useState('')
  const queryClient = useQueryClient();
  const { subscribeToTicker } = useRealtimePrice()

  const addStockMutation = useMutation({
    mutationFn: async (ticker: string) => {
      await watchlistHooks.addStock(ticker)
    },
    onMutate: () => {
      setIsAdding(true)
    },
    onSuccess: (_, ticker) => {
      queryClient.invalidateQueries({ queryKey: ['watchlistPrices'] })
      subscribeToTicker(ticker)
    },
    onError: (error) => {
      toast.error('Could not add stock', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    },
    onSettled: () => {
      setIsAdding(false)
    }
  })

  const handleAddStock = async (ticker: string) => {
    const cleanTicker = ticker.toUpperCase()
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
          placeholder={`Enter Ticker (e.g AAPL)`}
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
          className="border rounded-md px-3 py-2 w-64 bg-background text-foreground"
          disabled={isAdding}
        />
        <Button type="submit" disabled={isAdding || !newTicker.trim()}>
          {isAdding ? 'Adding...' : 'Add Stock'}
        </Button>
      </form>
    </div>
  )
}
