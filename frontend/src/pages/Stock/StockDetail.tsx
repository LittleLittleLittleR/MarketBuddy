import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRealtimePrice } from '@/context/RealtimePriceContext';
import { useCandlesQuery, useProfileQuery, useEarningsQuery } from '@/hooks/candles';
import type { RangeOption } from '@/types/candles';

import { QuoteHeader } from './components/QuoteHeader';
import { PriceChart } from './components/PriceChart';
import { RangeSelector } from './components/RangeSelector';
import { KeyStats } from './components/KeyStats';
import { EarningsPanel } from './components/EarningsPanel';
import { StockNarrative } from './components/StockNarrative';
import { ActionButtons } from './components/ActionButtons';
import { Button } from '@/components/ui/button';

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { subscribeToTicker, latestPrices, status } = useRealtimePrice();

  const [range, setRange] = useState<RangeOption>('1D');

  const ticker = (symbol ?? '').toUpperCase();

  useEffect(() => {
    if (ticker && status === 'connected') {
      subscribeToTicker(ticker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, status]);

  const { data: candleData, isLoading: candleLoading } = useCandlesQuery(ticker, range);
  const { data: profile, isLoading: profileLoading } = useProfileQuery(ticker);
  const { data: earnings, isLoading: earningsLoading } = useEarningsQuery(ticker);

  const latestPrice = latestPrices[ticker] ?? null;

  if (!ticker) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Invalid ticker symbol.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-xs font-mono text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Button>
        <ActionButtons ticker={ticker} />
      </div>

      {/* Quote header */}
      <QuoteHeader
        symbol={ticker}
        profile={profile}
        latestPrice={latestPrice}
        isProfileLoading={profileLoading}
      />

      {/* Range selector + Chart */}
      <div className="space-y-2">
        <RangeSelector active={range} onChange={setRange} />
        <div className="w-full h-[260px] sm:h-[320px] lg:h-[380px] rounded-lg border border-border/60 bg-card overflow-hidden">
          <PriceChart
            candles={candleData?.candles ?? []}
            range={range}
            latestPrice={latestPrice}
            isLoading={candleLoading}
          />
        </div>
      </div>

      {/* Stats + Earnings side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border/60 bg-card p-4">
          <KeyStats profile={profile} isLoading={profileLoading} />
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-4">
          <EarningsPanel earnings={earnings} isLoading={earningsLoading} />
        </div>
      </div>

      {/* AI summary and video showcase */}
      <div className="rounded-lg border border-border/60 bg-card p-4">
        <StockNarrative ticker={ticker} />
      </div>
    </div>
  );
}
