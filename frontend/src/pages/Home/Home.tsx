import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { signOut } from '@/lib/supabase'

import { profileService } from '@/db/profile'
import { watchlistStockService } from '@/db/watchlist_stock'
import { stockService } from '@/db/stock'

import type { StockResponse, WatchlistStockDisplay } from '@/types/stock'

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

import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

type SortKey = keyof WatchlistStockDisplay

type SortConfig = {
  key: SortKey | null
  direction: 'asc' | 'desc' | null
}

const Home = () => {

  const [userEmail, setUserEmail] = useState('')
  const [username, setUsername] = useState('')
  const [watchlist, setWatchlist] = useState<WatchlistStockDisplay[]>([])
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null,
  })

  const [newTicker, setNewTicker] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const navigate = useNavigate()

  const fetchWatchlist = async () => {
    const watchlistData = await watchlistStockService.getMyWatchlistStocks()
  
    const stockList: WatchlistStockDisplay[] = []
  
    for (const stock of watchlistData) {
      const stockData: StockResponse =
        await stockService.getStockByID(stock.stock_ticker)
  
      stockList.push({
        ticker: stockData.ticker,
        company_name: stockData.company_name,
        current_price: stockData.current_price,
        change_percent:
          stockData.current_price !== null &&
          stockData.open_price !== null &&
          stockData.open_price !== 0
            ? ((stockData.current_price - stockData.open_price) /
                stockData.open_price) *
              100
            : null,
      })
    }
  
    setWatchlist(stockList)
  }

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        navigate('/login')
        return
      }

      setUserEmail(user.email || '')
      const profile = await profileService.getMyProfile()
      setUsername(profile.username || '')

      await fetchWatchlist()
    }

    fetchUser()
  }, [navigate])

  const handleAddStock = async () => {
    try {
      if (!newTicker.trim()) {
        return
      }
      
      if (watchlist.length >= 3) {
        return
      }
  
      setIsAdding(true)
  
      // check if stock exists
      const stock = await stockService.getStockByID(
        newTicker.toUpperCase()
      )
  
      await watchlistStockService.createWatchlistStock({
        stock_ticker: stock.ticker,
      })
  
      // refresh watchlist
      await fetchWatchlist()
      setNewTicker('')

    } catch (error) {
      console.error('Failed to add stock:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteStock = async (ticker: string) => {
    try {
      const watchlistData = await watchlistStockService.getMyWatchlistStocks()
  
      const item = watchlistData.find(
        (s) => s.stock_ticker === ticker
      )
  
      if (!item) return
  
      await watchlistStockService.deleteWatchlistStock(item.id)
      await fetchWatchlist()

    } catch (error) {
      console.error('Failed to delete stock:', error)
    }
  }

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

  const sortedWatchlist = useMemo(() => {
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
    <div>
      {/* Navbar */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              MarketBuddy
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground md:block">
              {username || userEmail}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                  <Avatar>
                    <AvatarFallback>
                      {username.charAt(0).toUpperCase() || userEmail.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={signOut}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-7xl p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight">
            Your Watchlist
          </h2>

          <p className="text-muted-foreground">
            Track your favourite stocks in one place
          </p>
        </div>

        <Separator className="mb-6" />

        <div className="mb-6 flex gap-2">
          <input
            type="text"
            placeholder="Enter ticker (e.g. AAPL)"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            className="border rounded-md px-3 py-2 w-64"
          />

          <Button
            onClick={handleAddStock}
            disabled={isAdding}
          >
            {isAdding ? 'Adding...' : 'Add Stock'}
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4 text-center">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('ticker')}
                    >
                      <span>Ticker</span>

                      <span className="ml-2 inline-block w-4 text-center">
                        {getSortIndicator('ticker')}
                      </span>
                    </Button>
                  </TableHead>

                  <TableHead className="w-1/4 text-center">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('company_name')}
                    >
                      <span>Company</span>

                      <span className="ml-2 inline-block w-4 text-center">
                        {getSortIndicator('company_name')}
                      </span>
                    </Button>
                  </TableHead>

                  <TableHead className="w-1/4 text-center">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('current_price')}
                    >
                      <span>Price</span>

                      <span className="ml-2 inline-block w-4 text-center">
                        {getSortIndicator('current_price')}
                      </span>
                    </Button>
                  </TableHead>

                  <TableHead className="w-1/4 text-center">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('change_percent')}
                    >
                      <span>Change</span>

                      <span className="ml-2 inline-block w-4 text-center">
                        {getSortIndicator('change_percent')}
                      </span>
                    </Button>
                  </TableHead>
                </TableRow>
                <TableHead className="w-12 text-center">
                  {/* empty header for delete button */}
                </TableHead>
              </TableHeader>

              <TableBody>
                {sortedWatchlist.map((stock) => (
                  <TableRow key={stock.ticker}>
                    <TableCell className="font-medium text-center">
                      {stock.ticker}
                    </TableCell>

                    <TableCell className="text-center">
                      {stock.company_name}
                    </TableCell>

                    <TableCell className="text-center">
                      ${stock.current_price?.toFixed(2)}
                    </TableCell>

                    <TableCell
                      className={
                        stock.change_percent !== null && stock.change_percent >= 0
                          ? 'text-green-500 text-center'
                          : 'text-red-500 text-center'
                      }
                    >
                      {stock.change_percent !== null && stock.change_percent >= 0 ? '+' : ''}
                      {stock.change_percent !== null ? stock.change_percent.toFixed(2) : 'N/A'}%
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            ⋮
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDeleteStock(stock.ticker)}
                            className="text-red-500"
                          >
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
      </section>

    </div>
  )
}

export default Home;