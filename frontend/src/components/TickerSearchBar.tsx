import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { stockHooks } from '@/hooks/stock'
import { cn } from '@/lib/utils'

interface TickerSearchBarProps {
  className?: string
}

export default function TickerSearchBar({ className }: TickerSearchBarProps) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const searchMutation = useMutation({
    mutationFn: (ticker: string) => stockHooks.searchStock(ticker),
    onSuccess: (stock) => {
      setQuery('')
      navigate(`/stock/${stock.ticker}`)
    },
    onError: (error) => {
      toast.error('Ticker not found', {
        description:
          error instanceof Error
            ? error.message
            : `Couldn't find "${query.trim().toUpperCase()}". Check the symbol and try again.`,
      })
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const ticker = query.trim()
    if (!ticker || searchMutation.isPending) return
    searchMutation.mutate(ticker)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('relative w-full', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value.toUpperCase())}
        placeholder="Search ticker (e.g. AAPL)"
        aria-label="Search ticker"
        disabled={searchMutation.isPending}
        className="border border-input rounded-md pl-9 pr-9 h-10 focus-visible:border-ring"
      />
      {searchMutation.isPending && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </form>
  )
}
