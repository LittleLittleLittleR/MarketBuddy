import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { portfolioHooks } from '@/hooks/portfolio'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

type ManagePortfolioPopupProps = {
  isOpen: boolean
  setPortfolioNames: Dispatch<SetStateAction<[string, string][]>>
  onClose: () => void
}

export function ManagePortfolioPopup({ isOpen, setPortfolioNames, onClose }: ManagePortfolioPopupProps) {
  const [portfolios, setPortfolios] = useState<[string, string][]>([])

  useEffect(() => {
    const loadPortfolios = async () => {
      if (isOpen) {
        setPortfolios(await portfolioHooks.getPortfolios())
      }
    }
    
    loadPortfolios()
  }, [isOpen])

  const handleDeletePortfolio = (portfolio: string) => {
    if (portfolio.trim()) {
      portfolioHooks.deletePortfolio(portfolio.trim())
      setPortfolios(portfolios.filter(p => p[0] !== portfolio))
      setPortfolioNames(prev => prev.filter(p => p[0] !== portfolio))
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative z-10 w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
        <h2 className="text-lg font-medium mb-4">
          Manage Portfolios
        </h2>

        <ScrollArea className="h-72">
          <div className="space-y-2">
            {portfolios.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No portfolios yet.
              </p>
            ) : (
              portfolios.map((portfolio) => (
                <div
                  key={portfolio[0]}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <p className="font-medium">
                    {portfolio[0]}
                  </p>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      handleDeletePortfolio(portfolio[0])
                    }
                  >
                    Delete
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}