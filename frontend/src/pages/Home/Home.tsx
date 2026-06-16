import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { watchlistHooks } from '@/hooks/watchlist'
import type { WatchlistStockDisplay, PortfolioListDisplay } from '@/types/stock'

import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import Summaries from '@/components/feed/Summaries'
import { SharePopup } from '@/components/feed/Share'
import { WatchlistHeader } from '@/components/dashboard/WatchlistHeader'
import { PortfolioHeader } from '@/components/dashboard/PortfolioHeader'
import { WatchlistTable } from '@/components/dashboard/WatchlistTable'
import { PortfoliolistTable } from '@/components/dashboard/PortfoliolistTable'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SidebarProvider } from '@/components/ui/sidebar'
import { portfolioHooks } from '@/hooks/portfolio'
import { stockSummaryUpdater, type SummaryPayload } from '@/hooks/summary'

const Home = () => {
  const [isAdding, setIsAdding] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [selectedView, setSelectedView] = useState<string>('watchlist')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [summaryList, setSummaryList] = useState<SummaryPayload[]>([])
  const [isFetchingSummaries, setIsFetchingSummaries] = useState(false)

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

      setUserEmail(user.email || '')
    }

    fetchUser()
  }, [navigate])

  // watchlist
  const { data: watchlistStocks = [] } = useQuery<WatchlistStockDisplay[]>({
    queryKey: ['watchlistPrices'],
    queryFn: async () => {
      const res = await watchlistHooks.fetchStocks()
      return res || []
    },
    staleTime: Infinity,
  })

  // portfolio
  const { data: portfolios = [] } = useQuery<PortfolioListDisplay[]>({
    queryKey: ['portfolioPrices'],
    queryFn: async () => {
      const res = await portfolioHooks.fetchStocks()
      return res || []
    },
    staleTime: Infinity,
  })
  const { data: portfolioNames = [] } = useQuery<[string, string][]>({
    queryKey: ['portfolioNames'],
    queryFn: async () => {
      const res = await portfolioHooks.getPortfolios()
      return res || []
    },
    staleTime: Infinity,
  })

  const selectedPortfolio = portfolios.find((portfolio) => portfolio.name === selectedView)

  const fetchSummaries = useCallback(async () => {
    setIsFetchingSummaries(true)

    try {
      await stockSummaryUpdater({ setSummarylist: setSummaryList })
    } finally {
      setIsFetchingSummaries(false)
    }
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value)

    if (value === 'feed' && summaryList.length === 0 && !isFetchingSummaries) {
      void fetchSummaries()
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">

        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-6">
          <SidebarProvider>
            <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
              <DashboardSidebar
                portfolioNames={portfolioNames}
                selectedView={selectedView}
                onSelectView={setSelectedView}
              />

              <div className="space-y-6">
                {selectedView === 'watchlist' && (
                  <>
                    <WatchlistHeader
                      isAdding={isAdding}
                      setIsAdding={setIsAdding}
                    />
                    <WatchlistTable stocks={watchlistStocks} />
                  </>
                )}

                {selectedView !== 'watchlist' && selectedPortfolio && (
                  <>
                    <PortfolioHeader portfolioId={selectedPortfolio.id} />
                    <PortfoliolistTable portfolio={selectedPortfolio} />
                  </>
                )}
              </div>
            </div>
          </SidebarProvider>
        </TabsContent>

        {/* FEED */}
        <TabsContent value="feed" className="text-muted-foreground">
          <Summaries
            summaries={summaryList}
            isFetching={isFetchingSummaries}
            onFetchSummaries={fetchSummaries}
            onShareSummaries={() => setIsSharing(true)}
            disableFetch={isFetchingSummaries}
          />

          <SharePopup
            isOpen={isSharing}
            onClose={() => setIsSharing(false)}
            summaries={summaryList}
            userEmail={userEmail}
          />
        </TabsContent>

        {/* VIDEOS */}
        <TabsContent value="videos" className="text-muted-foreground">
          videos coming soon...
        </TabsContent>

      </Tabs>
    </div>
  )
}

export default Home
