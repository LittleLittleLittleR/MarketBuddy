import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { watchlistHooks } from '@/hooks/watchlist';
import { portfolioHooks } from '@/hooks/portfolio';
import { AddTradePopup } from '@/components/dashboard/AddTrade';
import type { WatchlistStockDisplay, PortfolioNames } from '@/types/stock';

interface ActionButtonsProps {
  ticker: string;
}

export function ActionButtons({ ticker }: ActionButtonsProps) {
  const queryClient = useQueryClient();
  const [tradeOpen, setTradeOpen] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);

  const watchlist = queryClient.getQueryData<WatchlistStockDisplay[]>(['watchlistPrices']);
  const isWatched = watchlist?.some((s) => s.ticker.toUpperCase() === ticker.toUpperCase()) ?? false;

  const addWatchlistMutation = useMutation({
    mutationFn: () => watchlistHooks.addStock(ticker),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlistPrices'] }),
  });

  const removeWatchlistMutation = useMutation({
    mutationFn: () => watchlistHooks.deleteStock(ticker),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlistPrices'] }),
  });

  // Get portfolios for the trade popup
  const { data: portfolioNames } = useQuery<PortfolioNames[]>({
    queryKey: ['portfolioNames'],
    queryFn: async () => {
      const pairs = await portfolioHooks.getPortfolios();
      return pairs.map(([name, created_at], i) => ({ id: i + 1, name, created_at }));
    },
  });

  const handleAddTrade = () => {
    if (portfolioNames && portfolioNames.length > 0) {
      setSelectedPortfolioId(portfolioNames[0].id);
    }
    setTradeOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (isWatched) {
              removeWatchlistMutation.mutate();
            } else {
              addWatchlistMutation.mutate();
            }
          }}
          disabled={addWatchlistMutation.isPending || removeWatchlistMutation.isPending}
          className={`text-xs font-mono ${isWatched
            ? 'border-amber-500/60 text-amber-400 hover:bg-amber-500/10'
            : 'hover:border-green-500/60 hover:text-green-400'
            }`}
        >
          {isWatched ? '★ Watching' : '☆ Watch'}
        </Button>

        <Button
          size="sm"
          onClick={handleAddTrade}
          className="text-xs font-mono bg-foreground text-background hover:bg-foreground/80"
        >
          + Add Trade
        </Button>
      </div>

      {tradeOpen && selectedPortfolioId != null && (
        <AddTradePopup
          isOpen={tradeOpen}
          onClose={() => setTradeOpen(false)}
          portfolioId={selectedPortfolioId}
        />
      )}
    </>
  );
}
