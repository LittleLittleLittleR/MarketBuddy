import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle, RangeOption } from '@/types/candles';
import type { LatestPrice } from '@/context/RealtimePriceContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface PriceChartProps {
  candles: Candle[];
  range: RangeOption;
  latestPrice: LatestPrice | null;
  isLoading: boolean;
}

type ChartMode = 'candle' | 'line';

export function PriceChart({ candles, range, latestPrice, isLoading }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [mode, setMode] = useState<ChartMode>('candle');

  useEffect(() => {
    if (!containerRef.current || !candles.length) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: '#09090b' },
        textColor: '#a1a1aa',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#18181b' },
        horzLines: { color: '#18181b' },
      },
      rightPriceScale: { borderColor: '#27272a' },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    if (mode === 'candle') {
      const cs = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
      cs.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
      candleSeriesRef.current = cs;
    } else {
      const ls = chart.addSeries(LineSeries, {
        color: '#60a5fa',
        lineWidth: 2,
      });
      ls.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.close,
        }))
      );
      lineSeriesRef.current = ls;
    }

    chart.timeScale().fitContent();

    return () => {
      candleSeriesRef.current = null;
      lineSeriesRef.current = null;
      chart.remove();
    };
  }, [candles, mode]);

  useEffect(() => {
    if (range !== '1D' || !latestPrice) return;
    const minuteTs = (Math.floor(Date.now() / 1000 / 60) * 60) as UTCTimestamp;
    candleSeriesRef.current?.update({
      time: minuteTs,
      open: latestPrice.open ?? latestPrice.price,
      high: latestPrice.price,
      low: latestPrice.price,
      close: latestPrice.price,
    });
    lineSeriesRef.current?.update({ time: minuteTs, value: latestPrice.price });
  }, [latestPrice, range]);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 z-20">
          <Skeleton className="w-full h-full rounded-none" />
        </div>
      )}
      {!isLoading && !candles.length && (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-sm text-muted-foreground">
          No chart data available for this range.
        </div>
      )}
      <div className="absolute top-2 right-2 z-10 flex gap-1 bg-black/60 border border-zinc-700 rounded p-0.5">
        <Button
          variant="ghost" size="sm"
          onClick={() => setMode('candle')}
          className={`h-6 px-2 text-[10px] font-mono rounded ${mode === 'candle' ? 'bg-white text-black' : 'text-zinc-400'}`}
        >
          OHLC
        </Button>
        <Button
          variant="ghost" size="sm"
          onClick={() => setMode('line')}
          className={`h-6 px-2 text-[10px] font-mono rounded ${mode === 'line' ? 'bg-white text-black' : 'text-zinc-400'}`}
        >
          LINE
        </Button>
      </div>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
