import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '@/lib/supabase'
import { signOut } from '@/lib/supabase'

import { profileService } from '@/db/profile'

import { watchlistStockHooks } from '@/hooks/watchlist_stock'

import type { WatchlistStockDisplay } from '@/types/stock'

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
import StockPriceUpdater from '@/hooks/price_tracking'
import { stockSummaryUpdater } from '@/hooks/summary'

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

  const [summarylist, setSummarylist] = useState<string[]>([])
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  const navigate = useNavigate()

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
    }

    fetchUser()
  }, [navigate])

  const handleAddStock = async () => {
    try {
      if (watchlist.length === 3) {
        return
      }

      setIsAdding(true)
      await watchlistStockHooks.addStock(newTicker)
      location.reload();

      setNewTicker('')

    } catch (error) {
      console.error('Failed to add stock:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteStock = async (ticker: string) => {
    try {
      await watchlistStockHooks.deleteStock(ticker)
      location.reload();

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

  const fetchSummary = async () => {
  try {
    setIsGeneratingSummary(true)

    await stockSummaryUpdater({ setSummarylist })

  } catch (error) {
    console.error('Failed to fetch summaries:', error)
  } finally {
    setIsGeneratingSummary(false)
  }
}

  // // refetch watchlist every minute to get latest prices
  // useEffect(() => {
  //   const fetchLatestWatchlist = async () => {
  //     const data = await watchlistStockHooks.fetchWatchlist();
  
  //     setWatchlist(data);
  //     console.log('Watchlist updated:', data);
  //   };
  
  //   fetchLatestWatchlist();
  
  //   const interval = setInterval(fetchLatestWatchlist, 60 * 1000);
  
  //   return () => clearInterval(interval);
  // }, []);

  return (
    <div>
      <StockPriceUpdater setWatchlist={setWatchlist} />
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
                  <TableHead className="w-12 text-center">
                    {/* empty header for delete button */}
                  </TableHead>
                </TableRow>
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

        {/* AI Stock Summaries */}
        <div className="mt-8 whitespace-pre-line text-gray-300">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                AI Market Summaries
              </h2>

              <p className="text-muted-foreground">
                Generate AI-powered summaries for your watchlist
              </p>
            </div>

            <Button
              onClick={fetchSummary}
              disabled={isGeneratingSummary || watchlist.length === 0}
            >
              {isGeneratingSummary
                ? 'Generating...'
                : 'Generate Summary'}
            </Button>
          </div>

          {summarylist.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-10">
                <p className="text-muted-foreground">
                  No summaries generated yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {summarylist.map((summary, index) => (
                <Card
                  key={index}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />

                      <span className="text-sm font-medium text-muted-foreground">
                        Summary #{index + 1}
                      </span>
                    </div>

                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{
                        __html: summary
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br />')
                      }}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  )
}

export default Home;