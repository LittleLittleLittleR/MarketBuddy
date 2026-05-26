import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { signOut } from "@/lib/supabase";
import { useNavigate } from 'react-router-dom';

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


type WatchlistStock = {
  ticker: string
  company_name: string
  current_price: number
  change_percent: number
}

const Home = () => {

  const [userEmail, setUserEmail] = useState('')
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([])

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

      // Example dummy data for now
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
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
              {userEmail}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                  <Avatar>
                    <AvatarFallback>
                      {userEmail.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout}>
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

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {watchlist.map((stock) => (
                <TableRow key={stock.ticker}>
                  <TableCell className="font-medium">
                    {stock.ticker}
                  </TableCell>

                  <TableCell>
                    {stock.company_name}
                  </TableCell>

                  <TableCell>
                    ${stock.current_price.toFixed(2)}
                  </TableCell>

                  <TableCell
                    className={
                      stock.change_percent >= 0
                        ? 'text-green-500'
                        : 'text-red-500'
                    }
                  >
                    {stock.change_percent >= 0 ? '+' : ''}
                    {stock.change_percent.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </section>
      
    </div>
  );
};

export default Home;
