import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { signOut } from '@/lib/supabase'
import { profileService } from '@/db/profile'

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

// dummy data type
type WatchlistStock = {
  ticker: string
  company_name: string
  current_price: number
  change_percent: number
}

type SortKey = keyof WatchlistStock

type SortConfig = {
  key: SortKey | null
  direction: 'asc' | 'desc' | null
}

const Home = () => {

  const [userEmail, setUserEmail] = useState('')
  const [username, setUsername] = useState('')
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([])
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null,
  })

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

      // dummy data for now
      setWatchlist([
        {
          ticker: 'AAPL',
          company_name: 'Apple Inc.',
          current_price: 213.55,
          change_percent: 1.24,
        },
        {
          ticker: 'TSLA',
          company_name: 'Tesla',
          current_price: 177.12,
          change_percent: -2.31,
        },
        {
          ticker: 'NVDA',
          company_name: 'NVIDIA',
          current_price: 120.33,
          change_percent: 4.12,
        },
      ])
    }

    fetchUser()
  }, [navigate])

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
      if (prev.direction === null) {
        return {
          key,
          direction: 'asc',
        }
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
                      ${stock.current_price.toFixed(2)}
                    </TableCell>

                    <TableCell
                      className={
                        stock.change_percent >= 0
                          ? 'text-green-500 text-center'
                          : 'text-red-500 text-center'
                      }
                    >
                      {stock.change_percent >= 0 ? '+' : ''}
                      {stock.change_percent.toFixed(2)}%
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