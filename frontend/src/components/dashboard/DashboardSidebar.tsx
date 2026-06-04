import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar'

import { Button } from '@/components/ui/button'

type PortfolioProps = {
  portfolios: string[]
  selectedView: string
  onSelectView: (view: string) => void
}

export function DashboardSidebar({ portfolios, selectedView, onSelectView }: PortfolioProps) {
  return (
    <Sidebar collapsible="none" className="h-full rounded-lg border bg-background max-h-[80vh]">
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
                {portfolios.map((portfolio) => (
                  <Button
                    key={portfolio}
                    variant={selectedView === portfolio ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => onSelectView(portfolio)}
                  >
                    {portfolio}
                  </Button>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Fixed bottom buttons */}
        <SidebarFooter className="border-t p-4">
          <div className="space-y-2">
            <Button variant="outline" className="w-full">
              Manage Portfolios
            </Button>

            <Button className="w-full">
              Add Portfolio
            </Button>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  )
}