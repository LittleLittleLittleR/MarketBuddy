import { useState } from 'react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar'

import { Button } from '@/components/ui/button'
import { AddPortfolioPopup } from './AddPortfolio'
import { ManagePortfolioPopup } from './ManagePortfolio'

type PortfolioProps = {
  portfolioNames: [string, string][]
  selectedView: string
  onSelectView: (view: string) => void
}

export function DashboardSidebar({ portfolioNames, selectedView, onSelectView }: PortfolioProps) {
  const [openAddPortfolio, setOpenAddPortfolio] = useState(false)
  const [openManagePortfolio, setOpenManagePortfolio] = useState(false)

  return (
    <>
    <Sidebar collapsible="none" className="h-full w-full rounded-lg border bg-background lg:w-[240px] max-h-[60vh] lg:max-h-[80vh]">
      <div className="flex h-full flex-col">
        {/* Scrollable section */}
        <SidebarContent className="flex-1 overflow-y-auto">
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="space-y-2 p-2">
                <Button
                  variant={selectedView === 'watchlist' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => onSelectView('watchlist')}
                >
                  Watchlist
                </Button>
                {portfolioNames.map(([name]) => (
                  <Button
                    key={name}
                    variant={selectedView === name ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => onSelectView(name)}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Fixed bottom buttons */}
        <SidebarFooter className="border-t p-4">
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => setOpenManagePortfolio(true)}>
              Manage Portfolios
            </Button>

            <Button variant="outline" className="w-full" onClick={() => setOpenAddPortfolio(true)}>
              Add Portfolio
            </Button>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>

    <AddPortfolioPopup 
      isOpen={openAddPortfolio}
      onClose={() => setOpenAddPortfolio(false)} 
    />
    <ManagePortfolioPopup 
      isOpen={openManagePortfolio} 
      onClose={() => setOpenManagePortfolio(false)} 
    />
    </>
  )
}