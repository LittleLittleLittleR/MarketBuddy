import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '@/lib/supabase'

import { watchlistStockHooks } from '@/hooks/watchlist_stock'

import type { StocklistDisplay } from '@/types/stock'
import { stockSummaryUpdater } from '@/hooks/summary'
import Summaries from '@/components/dashboard/Summaries'
import { WatchlistHeader } from '@/components/watchlist/WatchlistHeader'
import { StocklistTable } from '@/components/StocklistTable'
import { useQuery } from '@tanstack/react-query'

const Home = () => {
  const [isAdding, setIsAdding] = useState(false)
  const [summarylist, setSummarylist] = useState<string[]>([])
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  const navigate = useNavigate()

  // for checking permission
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        navigate('/login')
        return
      }
    }

    fetchUser()
  }, [navigate])

  // react query for cached watchlistPrices
  const { data: watchlistStocks = [] } = useQuery<StocklistDisplay[]>({
    queryKey: ['watchlistPrices'], // when invalidated, this repolls 
    queryFn: async () => {
      const response = await watchlistStockHooks.fetchWatchlist()
      return response || []
    },
    staleTime: Infinity,
  })

  // react query for cached summaryPrices
  const { data: summarylistStocks = [] } = useQuery<StocklistDisplay[]>({
    queryKey: ['summaryPrices'],
    queryFn: async () => {
      // TODO: implement summaryPrices query function
      return [];
    },
    staleTime: Infinity,
  })

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

  return (
    <div>
      {/* Content */}
      <section className="mx-auto max-w-7xl p-6">
        <WatchlistHeader
          watchlist={watchlistStocks}
          isAdding={isAdding}
          setIsAdding={setIsAdding}
        />
        <StocklistTable
          stockType={"watchlist"}
        />
        <Summaries
          summaryList={summarylist}
          isFetching={isGeneratingSummary}
          onFetchSummaries={fetchSummary}
          disableFetch={watchlistStocks.length === 0} />
      </section>
    </div>
  )
}

export default Home;
