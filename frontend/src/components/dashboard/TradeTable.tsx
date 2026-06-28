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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import type { PortfolioTradeDisplay, TradeDisplay } from '@/types/trade'
import { tradeHooks } from '@/hooks/trade'
import { useRealtimePrice } from '@/context/RealtimePriceContext'

type SortKey = keyof TradeDisplay

type SortConfig = {
  key: SortKey | null
  direction: 'asc' | 'desc' | null
}

type TradeTableProps = {
  trades: PortfolioTradeDisplay
}

export function TradeTable({ trades }: TradeTableProps) {
  const queryClient = useQueryClient();
  const { status } = useRealtimePrice();

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null,
  })

  const deleteMutation = useMutation({
    mutationFn: async (tradeId: number) => {
      await tradeHooks.deleteTrade(tradeId)
      return tradeId
    },
    onMutate: async (tradeIdToDelete) => {
      await queryClient.cancelQueries({
        queryKey: ['tradeByPortfolio'],
      })
  
      const previousTrades = queryClient.getQueryData<PortfolioTradeDisplay[]>(['tradeByPortfolio'])
  
      queryClient.setQueryData(
        ['tradeByPortfolio'],
        (oldData: PortfolioTradeDisplay[] | undefined) => {
          if (!oldData) return []
          return oldData.map((portfolio) =>
            portfolio.name === trades.name
              ? { ...portfolio, trades: portfolio.trades.filter((t) => t.id !== tradeIdToDelete) }
              : portfolio
          )
        }
      )
  
      return { previousTrades }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tradeByPortfolio'] }),
        queryClient.invalidateQueries({ queryKey: ['portfolioPrices'] }),
      ])
    },
    onError: (err: unknown, _tradeId, context) => {
      if (context?.previousTrades) {
        queryClient.setQueryData(['tradeByPortfolio'], context.previousTrades)
      }
      console.error("Failed during delete operation for trade: ", err)
    }
  })

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
      return trades.trades
    }

    const sorted = [...trades.trades].sort((a, b) => {
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
  }, [trades, sortConfig])

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return '↕'

    if (sortConfig.direction === 'asc') return '↑'
    if (sortConfig.direction === 'desc') return '↓'

    return '↕'
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
                {(['ticker', 'side', 'quantity', 'entry_cost'] as SortKey[]).map((field) => (
                  <TableHead key={field} className="w-1/4 text-center">
                    <Button variant="ghost" onClick={() => handleSort(field)}>
                      <span className="capitalize">{field.replace('_', ' ')}</span>
                      <span className="ml-2 inline-block w-4 text-center">
                        {getSortIndicator(field)}
                      </span>
                    </Button>
                  </TableHead>
                ))}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((trade) => (
                <TableRow key={trade.ticker}>
                  <TableCell className="font-medium text-center">{trade.ticker}</TableCell>
                  <TableCell
                    className={`text-center font-medium ${trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}
                  >
                    {trade.side}
                  </TableCell>
                  <TableCell className="text-center">{trade.quantity}</TableCell>
                  <TableCell className="text-center">${trade.entry_cost.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">⋮</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => deleteMutation.mutate(trade.id)} className="text-red-500 cursor-pointer">
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
