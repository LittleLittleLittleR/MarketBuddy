import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { signOut } from "@/lib/supabase";
import { useNavigate } from 'react-router-dom';

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

            <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                  {userEmail.charAt(0).toUpperCase()}
            </Button>

            <Button variant="outline" className="h-10" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>
    </div>
  );
};

export default Home;
