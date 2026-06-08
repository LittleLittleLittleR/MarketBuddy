import { useState } from 'react'
import { portfolioHooks } from '@/hooks/portfolio'

type ManagePortfolioPopupProps = {
  isOpen: boolean
  onClose: () => void
}

export function ManagePortfolioPopup({ isOpen, onClose }: ManagePortfolioPopupProps) {
  const [portfolioName, setPortfolioName] = useState('')

  const handleDeletePortfolio = () => {
    if (portfolioName.trim()) {
      portfolioHooks.deletePortfolio(portfolioName.trim())
      setPortfolioName('')
      onClose()
    }
  }

  if (!isOpen) return;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">

      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
        <h2 className="text-lg font-medium mb-4">Manage Portfolios</h2>
        
        
      </div>
    </div>
  )
}