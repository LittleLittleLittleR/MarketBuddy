import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

import { AddTradePopup } from '@/components/dashboard/AddTrade'

type PortfolioHeaderProps = {
  portfolioId: number
}

export function PortfolioHeader({ portfolioId }: PortfolioHeaderProps) {
  const [openAddTrade, setOpenAddTrade] = useState(false)

  return (
    <div className="mb-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Your Portfolio</h2>
        <p className="text-muted-foreground">Track your favourite stocks in one place</p>
      </div>
      <Separator className="my-6" />

      <Button type="submit" onClick={() => setOpenAddTrade(true)}>
        Add Trade
      </Button>

      <AddTradePopup 
        isOpen={openAddTrade} 
        onClose={() => setOpenAddTrade(false)} 
        portfolioId={portfolioId}
      />
    </div>
  )
}
