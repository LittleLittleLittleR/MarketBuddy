import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

type WatchlistHeaderProps = {
  onAddStock: (ticker: string) => Promise<void>
  isAdding: boolean
  isLimitReached: boolean
}

export function WatchlistHeader({ onAddStock, isAdding, isLimitReached }: WatchlistHeaderProps) {
  const [newTicker, setNewTicker] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTicker.trim()) return
    await onAddStock(newTicker)
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
          placeholder="Enter ticker (e.g. AAPL)"
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
          className="border rounded-md px-3 py-2 w-64 bg-background text-foreground"
          disabled={isAdding || isLimitReached}
        />
        <Button type="submit" disabled={isAdding || isLimitReached || !newTicker.trim()}>
          {isAdding ? 'Adding...' : isLimitReached ? 'Limit Reached (3)' : 'Add Stock'}
        </Button>
      </form>
    </div>
  )
}
