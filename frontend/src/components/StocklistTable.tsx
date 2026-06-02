import type { StocklistDisplay } from '@/types/stock'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { watchlistStockHooks } from '@/hooks/watchlist_stock'
import { useRealtimePrice } from '@/context/RealtimePriceContext'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

type SortKey = keyof StocklistDisplay

type SortConfig = {
  key: SortKey | null
  direction: 'asc' | 'desc' | null
}

type StocklistTableProps = {
  stockType: 'watchlist' | 'portfolio' | 'summary'
}

export function StocklistTable({ stockType }: StocklistTableProps) {
  const { status } = useRealtimePrice();
  const queryClient = useQueryClient();

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null,
  })

  const { data: rawStocklist = [], isLoading } = useQuery<StocklistDisplay[]>({
    queryKey: ['watchlistPrices'],
    queryFn: async () => {
      if (stockType === 'watchlist') {
        const response = await watchlistStockHooks.fetchWatchlist()
        return response || []
      }
      return []
    },
    staleTime: Infinity,
  })

  const deleteMutation = useMutation({
    mutationFn: async (ticker: string) => {
      await watchlistStockHooks.deleteStock(ticker)
      return ticker
    },
    onSuccess: (deletedTicker) => {
      queryClient.setQueryData(['watchlistPrices'], (oldData: StocklistDisplay[] | undefined) => {
        return oldData ? oldData.filter(stock => stock.ticker !== deletedTicker) : []
      })
    },
    onError: (err) => {
      console.error("Failed during delete operation for ticker: ", err)
    }
  })

  const watchlist = useMemo(() => {
    return rawStocklist.map((stock) => {
      const price = (stock).current_price ?? stock.current_price ?? 0

      return {
        ...stock,
        current_price: price,
        change_percent: stock.change_percent
      }
    })
  }, [rawStocklist])



  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      // if new column selected then default to ascending
      if (prev.key !== key) {
        return {
          key,
          direction: 'asc',
        }
      }

      // if same column selected then toggle direction
      if (prev.direction === 'asc') {
        return {
          key,
          direction: 'desc',
        }
      }
      if (prev.direction === 'desc') {
        return {
          key: null,
          direction: null,
        }
      }
      return {
        key,
        direction: 'asc',
      }
    })
  }


  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return watchlist
    }

    const sorted = [...watchlist].sort((a, b) => {
      const aValue = a[sortConfig.key!]
      const bValue = b[sortConfig.key!]

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue
      }

      return sortConfig.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue))
    })

    return sorted
  }, [watchlist, sortConfig])

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return '↕'

    if (sortConfig.direction === 'asc') return '↑'
    if (sortConfig.direction === 'desc') return '↓'

    return '↕'
  }
  if (isLoading) {
    return <div className="text-center p-12 text-muted-foreground animate-pulse text-sm">Loading your watchlist...</div>
  }
  return (
    <div>
      {status === 'connecting' && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 px-4 py-2 rounded-md text-xs animate-pulse text-center">
          Live price stream disconnected. Attempting to re-establish link...
        </div>
      )}

      {status === 'error' && (
        <Alert variant="destructive" className="bg-red-950/20 border-red-500/30">
          <AlertTitle>Connection Dropped</AlertTitle>
          <AlertDescription className="text-sm">
            We maxed out connection attempts to the real-time data terminal. Live Updates are paused.
            <button
              onClick={() => window.location.reload()}
              className="ml-2 underline hover:text-white font-medium"
            >
              Click here to reload stream manually.
            </button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {['ticker', 'company_name', 'current_price', 'change_percent'].map((field) => (
                  <TableHead key={field} className="w-1/4 text-center">
                    <Button variant="ghost" onClick={() => handleSort(field as keyof StocklistDisplay)}>
                      <span className="capitalize">{field.replace('_', ' ')}</span>
                      <span className="ml-2 inline-block w-4 text-center">
                        {getSortIndicator(field as keyof StocklistDisplay)}
                      </span>
                    </Button>
                  </TableHead>
                ))}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((stock) => (
                <TableRow key={stock.ticker}>
                  <TableCell className="font-medium text-center">{stock.ticker}</TableCell>
                  <TableCell className="text-center">{stock.company_name}</TableCell>
                  <TableCell className="text-center">
                    {stock.current_price !== null ? `$${stock.current_price.toFixed(2)}` : 'N/A'}
                  </TableCell>
                  <TableCell
                    className={`text-center font-medium ${stock.change_percent !== null && stock.change_percent >= 0
                      ? 'text-green-500'
                      : 'text-red-500'
                      }`}
                  >
                    {stock.change_percent !== null && stock.change_percent >= 0 ? '+' : ''}
                    {stock.change_percent !== null ? `${stock.change_percent.toFixed(2)}%` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">⋮</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => deleteMutation.mutate(stock.ticker)} className="text-red-500 cursor-pointer">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
