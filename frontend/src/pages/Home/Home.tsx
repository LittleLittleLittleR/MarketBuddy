import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '@/lib/supabase'

import { watchlistStockHooks } from '@/hooks/watchlist_stock'

import type { WatchlistStockDisplay } from '@/types/stock'
import { fetchMyWatchlistPrices } from '@/hooks/price_fetching'
import { stockSummaryUpdater } from '@/hooks/summary'
import Summaries from '@/components/dashboard/Summaries'
import { WatchlistHeader } from '@/components/watchlist/WatchlistHeader'
import { WatchlistTable } from '@/components/watchlist/WatchlistTable'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const Home = () => {
  const [isAdding, setIsAdding] = useState(false)
  const [summarylist, setSummarylist] = useState<string[]>([])
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  const navigate = useNavigate()
  const queryClient = useQueryClient();

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
  const { data: watchlist = [] } = useQuery<WatchlistStockDisplay[]>({
    queryKey: ['watchlistPrices'], // when invalidated, this repolls 
    queryFn: async () => {
      const response = await watchlistStockHooks.fetchWatchlist()
      return response || []
    },
    staleTime: Infinity,
  })

  const addStockMutation = useMutation({
    mutationFn: async (ticker: string) => {
      await watchlistStockHooks.addStock(ticker)
    },
    onMutate: () => {
      setIsAdding(true)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlistPrices'] }) // invalidate querykey for repoll
    },
    onError: (error) => {
      console.error('Failed to add stock entry:', error)
    },
    onSettled: () => {
      setIsAdding(false)
    }
  })

  const handleAddStock = async (ticker: string) => {
    const cleanTicker = ticker.toUpperCase()
    if (watchlist.length >= 3) {
      console.warn("Watchlist threshold met. Max 3 entries allowed.")
      return
    }
    addStockMutation.mutate(cleanTicker)
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

  return (
    <div>
      {/* Content */}
      <section className="mx-auto max-w-7xl p-6">
        <WatchlistHeader
          onAddStock={handleAddStock}
          isAdding={isAdding}
          isLimitReached={watchlist.length >= 3}
        />
        <WatchlistTable />
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
