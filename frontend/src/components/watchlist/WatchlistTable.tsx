import type { WatchlistStockDisplay } from '@/types/stock'
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

type WatchlistTableProps = {
  watchlist: WatchlistStockDisplay[]
  onDeleteStock: (ticker: string) => Promise<void>
}

type SortKey = keyof WatchlistStockDisplay

type SortConfig = {
  key: SortKey | null
  direction: 'asc' | 'desc' | null
}

export function WatchlistTable({ watchlist, onDeleteStock }: WatchlistTableProps) {

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null,
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

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {['ticker', 'company_name', 'current_price', 'change_percent'].map((field) => (
                <TableHead key={field} className="w-1/4 text-center">
                  <Button variant="ghost" onClick={() => handleSort(field as keyof WatchlistStockDisplay)}>
                    <span className="capitalize">{field.replace('_', ' ')}</span>
                    <span className="ml-2 inline-block w-4 text-center">
                      {getSortIndicator(field as keyof WatchlistStockDisplay)}
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
                      <DropdownMenuItem onClick={() => onDeleteStock(stock.ticker)} className="text-red-500 cursor-pointer">
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
  )
}
