import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '@/lib/supabase'

import { stocklistHooks } from '@/hooks/stocklist'

import type { StocklistDisplay } from '@/types/stock'
import { stockSummaryUpdater } from '@/hooks/summary'
import Summaries from '@/components/dashboard/Summaries'
import { StocklistHeader } from '@/components/stocklist/StocklistHeader'
import { StocklistTable } from '@/components/stocklist/StocklistTable'
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
      const response = await stocklistHooks.fetchStocklist({ stockType: "watchlist" })
      return response || []
    },
    staleTime: Infinity,
  })

  // react query for cached summaryPrices
  const { data: summarylistStocks = [] } = useQuery<StocklistDisplay[]>({
    queryKey: ['summarylistPrices'],
    queryFn: async () => {
      const response = await stocklistHooks.fetchStocklist({ stockType: "summarylist" })
      return response || []
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
        <StocklistHeader
          stocklist={summarylistStocks}
          isAdding={isAdding}
          setIsAdding={setIsAdding}
          stockType="summarylist"
        />
        <StocklistTable
          stockType={"summarylist"}
        />
        <Summaries
          summaryList={summarylist}
          isFetching={isGeneratingSummary}
          onFetchSummaries={fetchSummary}
          disableFetch={summarylistStocks.length === 0} />
      </section>
    </div>
  )
}

export default Home;
