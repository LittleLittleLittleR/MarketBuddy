import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar'

import { Button } from '@/components/ui/button'

type PortfolioProps = {
  portfolios: string[];
}

export function PortfolioSidebar({ portfolios }: PortfolioProps) {
  return (
    <Sidebar>
      <div className="flex h-full flex-col">
        {/* Scrollable section */}
        <SidebarContent className="flex-1 overflow-y-auto">
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="space-y-2 p-2">
                {portfolios.map((portfolio) => (
                  <Button
                    key={portfolio}
                    variant="ghost"
                    className="w-full justify-start"
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