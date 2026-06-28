import type { PortfolioListDisplay, PortfoliolistStockDisplay } from '@/types/stock'
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
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRealtimePrice } from '@/context/RealtimePriceContext'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'

type Row = PortfoliolistStockDisplay & { change_percent: number | null }

type SortKey = keyof Row

type SortConfig = {
  key: SortKey | null
  direction: 'asc' | 'desc' | null
}

type PortfoliolistTableProps = {
  portfolio: PortfolioListDisplay
}

export function PortfoliolistTable({ portfolio }: PortfoliolistTableProps) {
  const { status } = useRealtimePrice();
  const navigate = useNavigate();

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null,
  })

  const portfolioRows = useMemo(() => {
    return {
      name: portfolio.name,
      stocks: portfolio.stocks.map((stock) => {
        const change_percent =
          stock.current_price != null && stock.open_price != null && stock.open_price !== 0
            ? ((stock.current_price - stock.open_price) / stock.open_price) * 100
            : null

        return {
          ...stock,
          change_percent,
        } as Row
      }),
    }
  }, [portfolio])



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

      <div className="space-y-6">
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">{portfolioRows.name}</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  {['ticker', 'company name', 'quantity', 'average price', 'current price', 'P&L'].map((field) => (
                    <TableHead key={field} className="w-1/4 text-center">
                      <Button variant="ghost" onClick={() => handleSort(field as SortKey)}>
                        <span className="capitalize">{field}</span>
                        <span className="ml-2 inline-block w-4 text-center">
                          {getSortIndicator(field as SortKey)}
                        </span>
                      </Button>
                    </TableHead>
                  ))}
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ...portfolioRows.stocks,
                ]
                  .sort((a, b) => {
                    if (!sortConfig.key || !sortConfig.direction) {
                      return 0
                    }

                    const aValue = a[sortConfig.key]
                    const bValue = b[sortConfig.key]

                    if (typeof aValue === 'number' && typeof bValue === 'number') {
                      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
                    }

                    return sortConfig.direction === 'asc'
                      ? String(aValue).localeCompare(String(bValue))
                      : String(bValue).localeCompare(String(aValue))
                  })
                  .map((stock) => (
                    <TableRow
                      key={stock.ticker}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => navigate(`/stock/${stock.ticker}`)}
                    >
                      <TableCell className="font-medium text-center">{stock.ticker}</TableCell>
                      <TableCell className="text-center">{stock.company_name}</TableCell>
                      <TableCell className="text-center">{stock.quantity}</TableCell>
                      <TableCell className="text-center">${stock.average_price.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{stock.current_price != null ? `$${stock.current_price.toFixed(2)}` : 'N/A'}</TableCell>
                      <TableCell
                        className={`text-center font-medium ${stock.profit_loss > 0 ? 'text-green-500'
                          : stock.profit_loss < 0 ? 'text-red-500'
                          : 'text-gray-500'
                          }`}
                      >
                        {stock.profit_loss.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
