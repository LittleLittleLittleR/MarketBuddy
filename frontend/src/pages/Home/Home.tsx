import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '@/lib/supabase'

import { watchlistStockHooks } from '@/hooks/watchlist_stock'

import type { WatchlistStockDisplay } from '@/types/stock'
import LiveStockPriceUpdater from '@/hooks/price_tracking'
import { fetchMyWatchlistPrices } from '@/hooks/price_fetching'
import { stockSummaryUpdater } from '@/hooks/summary'
import Summaries from '@/components/dashboard/Summaries'
import { WatchlistHeader } from '@/components/watchlist/WatchlistHeader'
import { WatchlistTable } from '@/components/watchlist/WatchlistTable'

const Home = () => {

  const [watchlist, setWatchlist] = useState<WatchlistStockDisplay[]>([])
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

      const data = await fetchMyWatchlistPrices();
      setWatchlist(data || [])
    }

    fetchUser()
  }, [navigate])

  const handleAddStock = async (ticker: string) => {
    ticker = ticker.toUpperCase();
    try {
      if (watchlist.length === 3) {
        console.log("Watchlist full! Unable to add stock")
        return
      }

      setIsAdding(true)
      console.log("Adding Stock...", ticker)
      await watchlistStockHooks.addStock(ticker)
      const data = await fetchMyWatchlistPrices();
      console.log("Data fetched from watchlist is: ", data)
      setWatchlist(data || [])
    } catch (error) {
      console.error('Failed to add stock:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteStock = async (ticker: string) => {
    try {
      await watchlistStockHooks.deleteStock(ticker)
      const data = await fetchMyWatchlistPrices();
      setWatchlist(data || []);

    } catch (error) {
      console.error('Failed to delete stock:', error)
    }
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
      <LiveStockPriceUpdater setWatchlist={setWatchlist} />
      {/* Content */}
      <section className="mx-auto max-w-7xl p-6">
        <WatchlistHeader
          onAddStock={handleAddStock}
          isAdding={isAdding}
          isLimitReached={watchlist.length >= 3}
        />
        <WatchlistTable
          watchlist={watchlist}
          onDeleteStock={handleDeleteStock}
        />
        <Summaries
          summaryList={summarylist}
          isFetching={isGeneratingSummary}
          onFetchSummaries={fetchSummary}
          disableFetch={watchlist.length === 0} />
      </section>
    </div>
  )
}

export default Home;
