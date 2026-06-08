import { useState, type Dispatch, type SetStateAction } from 'react'
import { portfolioHooks } from '@/hooks/portfolio'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AddPortfolioPopupProps = {
  isOpen: boolean
  setPortfolioNames: Dispatch<SetStateAction<[string, string][]>>
  onClose: () => void
}

export function AddPortfolioPopup({ isOpen, setPortfolioNames, onClose }: AddPortfolioPopupProps) {
  const [inputName, setInputName] = useState('')

  const handleCreatePortfolio = () => {
    if (inputName.trim()) {
      portfolioHooks.addPortfolio(inputName.trim())
      setInputName('')
      setPortfolioNames((prev: [string, string][]) => [...prev, [inputName.trim(), new Date().toISOString()]])
      onClose()
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">

      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative z-10 w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
        <h2 className="text-lg font-medium mb-4">Add New Portfolio</h2>
        <Input
          type="text"
          placeholder="Portfolio Name"
          className="w-full border p-2 mb-4"
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
        />
        <Button 
          className="w-full"
          type="submit" 
          onClick={handleCreatePortfolio}
        >
          Create Portfolio
        </Button>
      </div>
    </div>
  )
}