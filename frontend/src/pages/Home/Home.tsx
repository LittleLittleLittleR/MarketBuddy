import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { stocklistHooks } from '@/hooks/watchlist'
import { stockSummaryUpdater } from '@/hooks/summary'

import type { WatchlistStockDisplay, PortfolioListDisplay } from '@/types/stock'

import Summaries from '@/components/dashboard/Summaries' // change to feed component later
import { StocklistHeader } from '@/components/stocklist/StocklistHeader'
import { StocklistTable } from '@/components/stocklist/StocklistTable'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { portfolioService } from '@/db/portfolio'
import { stockService } from '@/db/stock'

const Home = () => {
  const [isAdding, setIsAdding] = useState(false)
  const [summarylist, setSummarylist] = useState<string[]>([]) // use for feed tab later
  const [portfolioList, setPortfolioList] = useState<PortfolioListDisplay[]>([]) // change to portfolio type later

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
  const { data: watchlistStocks = [] } = useQuery<WatchlistStockDisplay[]>({
    queryKey: ['watchlistPrices'],
    queryFn: async () => {
      const res = await stocklistHooks.fetchStocklist({ stockType: 'watchlist' })
      return res || []
    },
    staleTime: Infinity,
  })

  // portfolio
  const { data: portfolios = [] } = useQuery<PortfolioListDisplay[]>({
    queryKey: ['portfolioPrices'],
    queryFn: async () => {
      const portfolios = await portfolioService.getMyPortfolios()
      const fetchedList: PortfolioListDisplay[] = []
      for (const portfolio of portfolios) {
        const stocks = await stockService.getStocksByPortfolio(portfolio.id)
        fetchedList.push({
          name: portfolio.name,
          stocks: stocks.map(stock => ({
            ticker: stock.ticker,
            company_name: '', // need to fetch company name separately if needed
            current_price: null, // need to fetch current price separately if needed
          })),
        })
      }
    },
    staleTime: Infinity,
  })

  const fetchSummary = async () => { // change to useEffect for polling feed tab later
    try {
      await stockSummaryUpdater({ setSummarylist })
    } catch (error) {
      console.error('Failed to fetch summaries:', error)
    } finally {
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <Tabs defaultValue="dashboard" className="w-full">

        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-6">
          <StocklistHeader
              stocklist={watchlistStocks}
              isAdding={isAdding}
              setIsAdding={setIsAdding}
              stockType="watchlist"
          />
          <StocklistTable stockType="watchlist" />
        </TabsContent>

        {/* FEED */}
        <TabsContent value="feed" className="text-muted-foreground">
          
        </TabsContent>

        {/* VIDEOS */}
        <TabsContent value="videos" className="text-muted-foreground">
          
        </TabsContent>

      </Tabs>
    </div>
  )
}

export default Home