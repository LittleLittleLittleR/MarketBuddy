import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { stocklistHooks } from '@/hooks/stocklist'
import { stockSummaryUpdater } from '@/hooks/summary'

import type { StocklistDisplay } from '@/types/stock'

import Summaries from '@/components/dashboard/Summaries'
import { StocklistHeader } from '@/components/stocklist/StocklistHeader'
import { StocklistTable } from '@/components/stocklist/StocklistTable'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

  // watchlist
  const { data: watchlistStocks = [] } = useQuery<StocklistDisplay[]>({
    queryKey: ['watchlistPrices'],
    queryFn: async () => {
      const res = await stocklistHooks.fetchStocklist({ stockType: 'watchlist' })
      return res || []
    },
    staleTime: Infinity,
  })

  // summarylist
  const { data: summarylistStocks = [] } = useQuery<StocklistDisplay[]>({
    queryKey: ['summarylistPrices'],
    queryFn: async () => {
      const res = await stocklistHooks.fetchStocklist({ stockType: 'summarylist' })
      return res || []
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
    <div className="mx-auto max-w-7xl p-6">
      <Tabs defaultValue="summarylist" className="w-full">

        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summarylist">Summary</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          <TabsTrigger value="profiles">Portfolios</TabsTrigger>
        </TabsList>

        {/* SUMMARYLIST */}
        <TabsContent value="summarylist" className="space-y-6">
          <StocklistHeader
            stocklist={summarylistStocks}
            isAdding={isAdding}
            setIsAdding={setIsAdding}
            stockType="summarylist"
          />

          <StocklistTable stockType="summarylist" />

          <Summaries
            summaryList={summarylist}
            isFetching={isGeneratingSummary}
            onFetchSummaries={fetchSummary}
            disableFetch={summarylistStocks.length === 0}
          />
        </TabsContent>

        {/* WATCHLIST */}
        <TabsContent value="watchlist" className="text-muted-foreground">
          <StocklistHeader
            stocklist={watchlistStocks}
            isAdding={isAdding}
            setIsAdding={setIsAdding}
            stockType="watchlist"
          />

          <StocklistTable stockType="watchlist" />
        </TabsContent>

        {/* PORTFOLIOS */}
        <TabsContent value="profiles" className="text-muted-foreground">
          Portfolios coming soon.
        </TabsContent>

      </Tabs>
    </div>
  )
}

export default Home